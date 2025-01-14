package sqlite

import (
	"context"
	"fmt"
	"time"

	"github.com/rilldata/rill/runtime/api"
	"github.com/rilldata/rill/runtime/drivers"
	"google.golang.org/protobuf/proto"
)

func (c *connection) FindObjects(ctx context.Context, instanceID string, typ drivers.CatalogObjectType) []*drivers.CatalogObject {
	if typ == drivers.CatalogObjectTypeUnspecified {
		return c.findObjects(ctx, "WHERE instance_id = ?", instanceID)
	} else {
		return c.findObjects(ctx, "WHERE instance_id = ? AND type = ?", instanceID, typ)
	}
}

func (c *connection) FindObject(ctx context.Context, instanceID string, name string) (*drivers.CatalogObject, bool) {
	// Names are stored with case everywhere, but the checks should be case-insensitive. Hence, the translation to lower case here.
	objs := c.findObjects(ctx, "WHERE instance_id = ? AND LOWER(name) = LOWER(?)", instanceID, name)
	if len(objs) == 0 {
		return nil, false
	}
	return objs[0], true
}

func (c *connection) findObjects(ctx context.Context, whereClause string, args ...any) []*drivers.CatalogObject {
	sql := fmt.Sprintf("SELECT name, type, sql, schema, managed, created_on, updated_on, refreshed_on FROM catalog %s ORDER BY lower(name)", whereClause)

	rows, err := c.db.QueryxContext(ctx, sql, args...)
	if err != nil {
		panic(err)
	}
	defer rows.Close()

	var res []*drivers.CatalogObject
	for rows.Next() {
		var schemaBlob []byte
		obj := &drivers.CatalogObject{}

		err := rows.Scan(&obj.Name, &obj.Type, &obj.SQL, &schemaBlob, &obj.Managed, &obj.CreatedOn, &obj.UpdatedOn, &obj.RefreshedOn)
		if err != nil {
			panic(err)
		}

		// Parse schema protobuf
		if schemaBlob != nil {
			obj.Schema = &api.StructType{}
			err = proto.Unmarshal(schemaBlob, obj.Schema)
			if err != nil {
				panic(err)
			}
		}

		res = append(res, obj)
	}

	return res
}

func (c *connection) CreateObject(ctx context.Context, instanceID string, obj *drivers.CatalogObject) error {
	// Serialize schema (note: if schema is nil, proto.Marshal returns nil)
	schema, err := proto.Marshal(obj.Schema)
	if err != nil {
		return err
	}

	now := time.Now()
	_, err = c.db.ExecContext(
		ctx,
		"INSERT INTO catalog(instance_id, name, type, sql, schema, managed, created_on, updated_on, refreshed_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		instanceID,
		obj.Name,
		obj.Type,
		obj.SQL,
		schema,
		obj.Managed,
		now,
		now,
		now,
	)
	if err != nil {
		return err
	}

	obj.CreatedOn = now
	obj.UpdatedOn = now
	obj.RefreshedOn = now
	return nil
}

func (c *connection) UpdateObject(ctx context.Context, instanceID string, obj *drivers.CatalogObject) error {
	// Serialize schema (note: if schema is nil, proto.Marshal returns nil)
	schema, err := proto.Marshal(obj.Schema)
	if err != nil {
		return err
	}

	now := time.Now()
	_, err = c.db.ExecContext(
		ctx,
		"UPDATE catalog SET type = ?, sql = ?, schema = ?, managed = ?, updated_on = ?, refreshed_on = ? WHERE instance_id = ? AND name = ?",
		obj.Type,
		obj.SQL,
		schema,
		obj.Managed,
		now,
		obj.RefreshedOn,
		instanceID,
		obj.Name,
	)
	if err != nil {
		return err
	}

	obj.UpdatedOn = now
	return nil
}

func (c *connection) DeleteObject(ctx context.Context, instanceID string, name string) error {
	_, err := c.db.ExecContext(ctx, "DELETE FROM catalog WHERE instance_id = ? AND name = ?", instanceID, name)
	return err
}
