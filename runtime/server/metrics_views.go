package server

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/rilldata/rill/runtime/api"
	"github.com/rilldata/rill/runtime/drivers"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/structpb"
)

// NOTE: The queries in here are generally not vetted or fully implemented. Use it as guidelines for the real implementation
// once the metrics view artifact representation is ready.

// MetricsViewMeta implements RuntimeService
func (s *Server) MetricsViewMeta(ctx context.Context, req *api.MetricsViewMetaRequest) (*api.MetricsViewMetaResponse, error) {
	// Get instance
	registry, _ := s.metastore.RegistryStore()
	inst, found := registry.FindInstance(ctx, req.InstanceId)
	if !found {
		return nil, status.Error(codes.InvalidArgument, "instance not found")
	}

	// Get catalog
	catalog, err := s.openCatalog(ctx, inst)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	// Find metrics view
	obj, ok := catalog.FindObject(ctx, inst.ID, req.MetricsViewName)
	if !ok {
		return nil, status.Error(codes.NotFound, "metrics view not found")
	}
	if obj.Type != drivers.CatalogObjectTypeMetricsView {
		return nil, status.Errorf(codes.NotFound, "object named '%s' is not a metrics view", req.MetricsViewName)
	}

	// TODO: not implemented

	return &api.MetricsViewMetaResponse{}, nil
}

// MetricsViewToplist implements RuntimeService
func (s *Server) MetricsViewToplist(ctx context.Context, req *api.MetricsViewToplistRequest) (*api.MetricsViewToplistResponse, error) {
	// Get instance
	registry, _ := s.metastore.RegistryStore()
	inst, found := registry.FindInstance(ctx, req.InstanceId)
	if !found {
		return nil, status.Error(codes.InvalidArgument, "instance not found")
	}

	// Get catalog
	catalog, err := s.openCatalog(ctx, inst)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	// Find metrics view
	obj, ok := catalog.FindObject(ctx, inst.ID, req.MetricsViewName)
	if !ok {
		return nil, status.Error(codes.NotFound, "metrics view not found")
	}
	if obj.Type != drivers.CatalogObjectTypeMetricsView {
		return nil, status.Errorf(codes.NotFound, "object named '%s' is not a metrics view", req.MetricsViewName)
	}

	// Build query
	timeCol := "" // TODO: not implemented
	sql, args, err := buildMetricsTopListSql(req, timeCol)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error building query: %s", err.Error())
	}

	// Execute
	meta, data, err := s.metricsQuery(ctx, req.InstanceId, sql, args)
	if err != nil {
		return nil, err
	}

	return &api.MetricsViewToplistResponse{
		Meta: meta,
		Data: data,
	}, nil
}

// MetricsViewTimeSeries implements RuntimeService
func (s *Server) MetricsViewTimeSeries(ctx context.Context, req *api.MetricsViewTimeSeriesRequest) (*api.MetricsViewTimeSeriesResponse, error) {
	// TODO: not implemented

	sql, args, err := buildMetricsTimeSeriesSQL(req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error building query: %s", err.Error())
	}

	meta, data, err := s.metricsQuery(ctx, req.InstanceId, sql, args)
	if err != nil {
		return nil, err
	}

	resp := &api.MetricsViewTimeSeriesResponse{
		Meta: meta,
		Data: data,
	}

	return resp, nil
}

// MetricsViewTotals implements RuntimeService
func (s *Server) MetricsViewTotals(ctx context.Context, req *api.MetricsViewTotalsRequest) (*api.MetricsViewTotalsResponse, error) {
	// TODO: not implemented

	sql, args, err := buildMetricsTotalsSql(req)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error building query: %s", err.Error())
	}

	meta, data, err := s.metricsQuery(ctx, req.InstanceId, sql, args)
	if err != nil {
		return nil, err
	}

	if len(data) == 0 {
		return nil, status.Errorf(codes.Internal, "no rows received from totals query")
	}

	resp := &api.MetricsViewTotalsResponse{
		Meta: meta,
		Data: data[0],
	}

	return resp, nil
}

func (s *Server) metricsQuery(ctx context.Context, instanceId string, sql string, args []any) ([]*api.MetricsViewColumn, []*structpb.Struct, error) {
	rows, err := s.query(ctx, instanceId, &drivers.Statement{
		Query:    sql,
		Args:     args,
		Priority: 1,
	})
	if err != nil {
		return nil, nil, status.Error(codes.InvalidArgument, err.Error())
	}
	defer rows.Close()

	data, err := rowsToData(rows)
	if err != nil {
		return nil, nil, status.Error(codes.Internal, err.Error())
	}

	return structTypeToMetricsViewColumn(rows.Schema), data, nil
}

func buildMetricsTopListSql(req *api.MetricsViewToplistRequest, timeCol string) (string, []any, error) {
	selectCols := append([]string{req.DimensionName}, req.MeasureNames...)

	args := []any{}
	whereClause := "WHERE 1=1"
	if timeCol != "" {
		if req.TimeStart != 0 {
			whereClause += fmt.Sprintf(" AND %s >= ?", timeCol)
			args = append(args, time.UnixMilli(req.TimeStart))
		}
		if req.TimeEnd != 0 {
			whereClause += fmt.Sprintf(" AND %s < ?", timeCol)
			args = append(args, time.UnixMilli(req.TimeEnd))
		}
	}

	if req.Filter != nil {
		clause, clauseArgs, err := buildFilterClauseForMetricsViewFilter(req.Filter)
		if err != nil {
			return "", nil, err
		}
		whereClause += " " + clause
		args = append(args, clauseArgs...)
	}

	orderClause := ""
	for i, s := range req.Sort {
		if i == 0 {
			orderClause += "ORDER BY "
		} else {
			orderClause += ", "
		}
		orderClause += s.Name
		if !s.Ascending {
			orderClause += " DESC"
		}
	}

	if req.Limit == 0 {
		req.Limit = 100
	}

	sql := fmt.Sprintf("SELECT %s FROM %s %s %s LIMIT %d",
		strings.Join(selectCols, ", "),
		req.MetricsViewName,
		whereClause,
		orderClause,
		req.Limit,
	)

	return sql, args, nil
}

func buildMetricsTimeSeriesSQL(req *api.MetricsViewTimeSeriesRequest) (string, []any, error) {
	// TODO: get from Catalog
	timeField := "timestamp"
	timeCol := fmt.Sprintf("DATE_TRUNC('%s', %s) AS %s", req.TimeGranularity, timeField, timeField)
	selectCols := append([]string{timeCol}, req.MeasureNames...)

	whereClause := fmt.Sprintf("%s >= epoch_ms(?) AND %s < epoch_ms(?) ", timeField, timeField)
	args := []any{req.TimeStart, req.TimeEnd}

	if req.Filter != nil {
		clause, clauseArgs, err := buildFilterClauseForMetricsViewFilter(req.Filter)
		if err != nil {
			return "", nil, err
		}
		whereClause += clause
		args = append(args, clauseArgs...)
	}

	sql := fmt.Sprintf(
		"SELECT %s FROM %s WHERE %s GROUP BY %s LIMIT 1000",
		strings.Join(selectCols, ", "),
		req.MetricsViewName,
		whereClause,
		timeField,
	)
	return sql, args, nil
}

func buildMetricsTotalsSql(req *api.MetricsViewTotalsRequest) (string, []any, error) {
	// TODO: get from Catalog
	timeField := "timestamp"
	whereClause := fmt.Sprintf("%s >= epoch_ms(?) AND %s < epoch_ms(?) ", timeField, timeField)
	args := []any{req.TimeStart, req.TimeEnd}

	if req.Filter != nil {
		clause, clauseArgs, err := buildFilterClauseForMetricsViewFilter(req.Filter)
		if err != nil {
			return "", nil, err
		}
		whereClause += clause
		args = append(args, clauseArgs...)
	}

	sql := fmt.Sprintf("SELECT %s FROM %s WHERE %s",
		strings.Join(req.MeasureNames, ", "), req.MetricsViewName, whereClause)
	return sql, args, nil
}

// Builds clause and args for api.MetricsViewFilter
func buildFilterClauseForMetricsViewFilter(filter *api.MetricsViewFilter) (string, []any, error) {
	whereClause := ""
	var args []any

	if filter != nil && filter.Include != nil {
		clause, clauseArgs, err := buildFilterClauseForConditions(filter.Include, false)
		if err != nil {
			return "", nil, err
		}
		whereClause += clause
		args = append(args, clauseArgs...)
	}

	if filter != nil && filter.Exclude != nil {
		clause, clauseArgs, err := buildFilterClauseForConditions(filter.Exclude, true)
		if err != nil {
			return "", nil, err
		}
		whereClause += clause
		args = append(args, clauseArgs...)
	}

	return whereClause, args, nil
}

func buildFilterClauseForConditions(conds []*api.MetricsViewFilter_Cond, exclude bool) (string, []any, error) {
	clause := ""
	var args []any

	for _, cond := range conds {
		condClause, condArgs, err := buildFilterClauseForCondition(cond, exclude)
		if err != nil {
			return "", nil, fmt.Errorf("filter error: %s", err.Error())
		}
		if condClause == "" {
			continue
		}
		clause += condClause
		args = append(args, condArgs...)
	}

	return clause, args, nil
}

func buildFilterClauseForCondition(cond *api.MetricsViewFilter_Cond, exclude bool) (string, []any, error) {
	var clauses []string
	var args []any

	var operatorPrefix string
	var conditionJoiner string
	if exclude {
		operatorPrefix = "NOT"
		conditionJoiner = "AND"
	} else {
		operatorPrefix = ""
		conditionJoiner = "OR"
	}

	if len(cond.In) > 0 {
		// null values should be added with IS NULL / IS NOT NULL
		nullCount := 0
		for _, val := range cond.In {
			if val == nil {
				nullCount++
				continue
			}
			arg, err := protobufValueToAny(val)
			if err != nil {
				return "", nil, fmt.Errorf("filter error: %s", err.Error())
			}
			args = append(args, arg)
		}

		questionMarks := strings.Join(repeatString("?", len(cond.In)-nullCount), ",")
		// <dimension> (NOT) IN (?,?,...)
		clauses = append(clauses, fmt.Sprintf("%s %s IN (%s)", cond.Name, operatorPrefix, questionMarks))
		if nullCount > 0 {
			// <dimension> IS (NOT) NULL
			clauses = append(clauses, fmt.Sprintf("%s IS %s NULL", cond.Name, operatorPrefix))
		}
	}

	if len(cond.Like) > 0 {
		for _, val := range cond.Like {
			arg, err := protobufValueToAny(val)
			if err != nil {
				return "", nil, fmt.Errorf("filter error: %s", err.Error())
			}
			args = append(args, arg)
			// <dimension> (NOT) ILIKE ?
			clauses = append(clauses, fmt.Sprintf("%s %s ILIKE ?", cond.Name, operatorPrefix))
		}
	}

	clause := ""
	if len(clauses) > 0 {
		clause = fmt.Sprintf(" AND %s", strings.Join(clauses, conditionJoiner))
	}
	return clause, args, nil
}

func repeatString(val string, n int) []string {
	res := make([]string, n)
	for i := 0; i < n; i++ {
		res[i] = val
	}
	return res
}

func protobufValueToAny(val *structpb.Value) (any, error) {
	switch v := val.GetKind().(type) {
	case *structpb.Value_StringValue:
		return v.StringValue, nil
	case *structpb.Value_BoolValue:
		return v.BoolValue, nil
	case *structpb.Value_NumberValue:
		return v.NumberValue, nil
	case *structpb.Value_NullValue:
		return nil, nil
	default:
		return nil, fmt.Errorf("value not supported: %v", v)
	}
}

func structTypeToMetricsViewColumn(v *api.StructType) []*api.MetricsViewColumn {
	res := make([]*api.MetricsViewColumn, len(v.Fields))
	for i, f := range v.Fields {
		res[i] = &api.MetricsViewColumn{
			Name:     f.Name,
			Type:     f.Type.Code.String(),
			Nullable: f.Type.Nullable,
		}
	}
	return res
}
