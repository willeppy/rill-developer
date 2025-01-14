package com.rilldata.calcite.visitors;

import com.rilldata.calcite.models.Artifact;
import com.rilldata.calcite.models.ArtifactStore;
import com.rilldata.calcite.models.ArtifactType;
import org.apache.calcite.sql.SqlCall;
import org.apache.calcite.sql.SqlIdentifier;
import org.apache.calcite.sql.SqlKind;
import org.apache.calcite.sql.util.SqlBasicVisitor;

/**
 * This is used to extract artifact key like METRICS VIEW name from the user query
 * */
public class ExtractArtifact extends SqlBasicVisitor<Artifact>
{
  ArtifactStore artifactStore;

  public ExtractArtifact(ArtifactStore artifactStore)
  {
    this.artifactStore = artifactStore;
  }

  @Override public Artifact visit(SqlCall call)
  {
    // its a FROM clause with table name and its alias like "FROM TEST AS T"
    // get the first operand and recursively call this visitor
    if (call.getKind().equals(SqlKind.AS)) {
      return call.operand(0).accept(this);
    }
    return null;
  }

  @Override public Artifact visit(SqlIdentifier id)
  {
    return id.isSimple() ? artifactStore.getArtifact(ArtifactType.METRICS_VIEW, id.getSimple()) : null;
  }
}
