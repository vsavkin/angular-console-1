"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var operators_1 = require("rxjs/operators");
var tmp_1 = require("tmp");
var child_process_1 = require("child_process");
var path_1 = require("path");
var fs_1 = require("fs");
try {
    require('dotenv').config();
}
catch (e) { }
var DeployBuilder = /** @class */ (function () {
    function DeployBuilder(context) {
        this.context = context;
    }
    DeployBuilder.prototype.run = function (builderConfig) {
        var _this = this;
        var _a = builderConfig.options.buildTarget.split(':'), project = _a[0], target = _a[1], configuration = _a[2];
        var buildBuilderConfig = this.context.architect.getBuilderConfiguration({
            project: project,
            target: target,
            configuration: configuration,
            overrides: {
                watch: true
            }
        });
        return this.context.architect
            .getBuilderDescription(buildBuilderConfig)
            .pipe(operators_1.concatMap(function (buildDescription) {
            return _this.context.architect.validateBuilderOptions(buildBuilderConfig, buildDescription);
        }), operators_1.concatMap(function (builderConfig) {
            return _this.context.architect.run(builderConfig, _this.context);
        }), operators_1.first(), operators_1.tap(function (r) {
            if (r.success) {
                if (builderConfig.options.create) {
                    _this.createApp(builderConfig);
                }
                console.log('Deploying to Azure...');
                var tmp = tmp_1.dirSync().name;
                var projectFolder = path_1.basename(buildBuilderConfig.options.outputPath);
                var tmpWithProject = path_1.join(tmp, projectFolder);
                child_process_1.execSync("cp -r " + buildBuilderConfig.options.outputPath + " " + tmp);
                var mainJs_1 = fs_1.readFileSync(path_1.join(tmpWithProject, 'main.js')).toString();
                Object.keys(process.env).forEach(function (k) {
                    if (k.startsWith('AZURE_COSMOS')) {
                        mainJs_1 = mainJs_1.replace("process.env." + k, "'" + process.env[k] + "'");
                    }
                });
                fs_1.writeFileSync(path_1.join(tmpWithProject, 'main.js'), mainJs_1);
                var dir = fs_1.readdirSync(path_1.join(buildBuilderConfig.sourceRoot, 'azure'))[0];
                child_process_1.execSync("cp -r " + path_1.join(buildBuilderConfig.sourceRoot, 'azure', dir) + "/*.* " + tmpWithProject);
                console.log("Tmp: " + tmpWithProject);
                child_process_1.execSync("git init", { cwd: tmpWithProject });
                child_process_1.execSync("git add .", { cwd: tmpWithProject });
                child_process_1.execSync("git commit -am 'init'", { cwd: tmpWithProject });
                child_process_1.execSync("git remote add azure " + builderConfig.options.deployment.remote, { cwd: tmpWithProject });
                child_process_1.execSync("git push --force " + createGitUrl(builderConfig.options.deployment.remote, builderConfig.options.username, builderConfig.options.password) + " master", {
                    cwd: tmpWithProject,
                    stdio: [0, 1, 2]
                });
                var apps = JSON.parse(child_process_1.execSync("az webapp list").toString());
                var app = apps.find(function (f) { return f.name === builderConfig.options.azureWebAppName; });
                var h = app.hostNames[0];
                console.log("You can access the deployed app at: https://" + h);
            }
        }));
    };
    DeployBuilder.prototype.createApp = function (builderConfig) {
        var resource = JSON.parse(child_process_1.execSync("az appservice plan list").toString())[0];
        var plan = resource.name;
        var resourceGroup = resource.resourceGroup;
        var runtime = "node|10.6";
        console.log('Creating a new webapp on Azure');
        child_process_1.execSync("az webapp create --name=" + builderConfig.options.azureWebAppName + " --plan=" + plan + " --resource-group=" + resourceGroup + " --runtime='" + runtime + "' --deployment-local-git", { stdio: [0, 1, 2] });
        console.log('Successfully create a new app on Azure');
    };
    return DeployBuilder;
}());
exports.default = DeployBuilder;
function createGitUrl(remote, username, password) {
    if (!username || !password) {
        return remote;
    }
    var _a = remote.split('://'), protocol = _a[0], url = _a[1];
    return protocol + "://" + username.replace(/@/g, '%40') + ":" + password.replace(/@/g, '%40') + "@" + url;
}
