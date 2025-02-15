import { execSync } from "node:child_process";
import { DataModelerCliCommand } from "./DataModelerCliCommand";
import { DimensionsActions } from "@rilldata/web-local/common/rill-developer-service/DimensionsActions";
import { MeasuresActions } from "@rilldata/web-local/common/rill-developer-service/MeasuresActions";
import { MetricsDefinitionActions } from "@rilldata/web-local/common/rill-developer-service/MetricsDefinitionActions";
import { MetricsViewActions } from "@rilldata/web-local/common/rill-developer-service/MetricsViewActions";
import { RillDeveloperService } from "@rilldata/web-local/common/rill-developer-service/RillDeveloperService";
import { ExpressServer } from "@rilldata/web-local/server/ExpressServer";
import { Command } from "commander";

export class StartCommand extends DataModelerCliCommand {
  public getCommand(): Command {
    return this.applyCommonSettings(
      new Command("start"),
      "Start the Rill Developer application. "
    ).action((opts, command: Command) => {
      const { project } = command.optsWithGlobals();
      return this.run({
        projectPath: project,
        shouldInitState: false,
        shouldSkipDatabase: false,
        profileWithUpdate: true,
      });
    });
  }

  protected async sendActions(): Promise<void> {
    await new ExpressServer(
      this.config,
      this.dataModelerService,
      new RillDeveloperService(
        this.dataModelerStateService,
        this.dataModelerService,
        this.dataModelerService.getDatabaseService(),
        [
          MetricsDefinitionActions,
          DimensionsActions,
          MeasuresActions,
          MetricsViewActions,
        ].map(
          (RillDeveloperActionsClass) =>
            new RillDeveloperActionsClass(
              this.config,
              this.dataModelerStateService,
              this.dataModelerService.getDatabaseService()
            )
        )
      ),
      this.dataModelerStateService,
      this.notificationService,
      this.metricsService
    ).init();
    execSync(`open ${this.config.server.serverUrl}`);
  }

  protected async teardown(): Promise<void> {
    // do not teardown as this will have a perpetual server
  }
}
