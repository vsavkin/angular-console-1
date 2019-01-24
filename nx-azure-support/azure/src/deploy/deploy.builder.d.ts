import { Builder, BuilderConfiguration, BuilderContext, BuildEvent } from '@angular-devkit/architect';
import { Observable } from 'rxjs';
export interface DeployArgs {
    buildTarget: string;
    azureWebAppName: string;
    create: boolean;
    deployment: {
        type: 'git' | 'zip';
        remote: string;
    };
}
export default class DeployBuilder implements Builder<DeployArgs> {
    private context;
    constructor(context: BuilderContext);
    run(builderConfig: BuilderConfiguration<DeployArgs>): Observable<BuildEvent>;
    private createApp;
}
