const childProcess = require('child_process')
const path = require('path')
const chalk = require('chalk')
const fs = require('fs-extra')
const latestVersion = require('latest-version')

class NgxElectronHandler {
    constructor(projectName, cwd) {
        this.projectName = projectName
        this.cwd = cwd
        this.angularPathChange = 'src/render'
        this.execPath = process.cwd()
        this.angularProjectPath = path.join(this.execPath, this.projectName)
        this.angularConfigPath = path.join(this.angularProjectPath, 'angular.json')
        this.angularPackageJsonPath = path.join(this.angularProjectPath, 'package.json')
        this.angularRenderSrcPath = path.join(this.angularProjectPath, 'src')
        this.angularRenderSrcAfterPath = path.join(this.angularProjectPath, this.angularPathChange)
        this.angularRenderTsConfigPath = path.join(this.angularProjectPath, 'tsconfig.app.json')
        this.angularRenderTsConfigAfterPath = path.join(this.angularProjectPath, 'tsconfig.render.json')
    }

    async run() {
        await this.clearProject()
        console.log(chalk.green('-------------clearProject success------------'))
        await this.initAngularProject()
        console.log(chalk.green('-------------initAngularProject success------------'))
        await this.addDependencies()
        console.log(chalk.green('-------------addDependencies success------------'))
        await this.changeAngularConfig()
        console.log(chalk.green('-------------changeAngularConfig success------------'))
        await this.changeAngularAppPath()
        console.log(chalk.green('-------------changeAngularAppPath success------------'))
        await this.changeRenderTsConfig()
        console.log(chalk.green('-------------changeRenderTsConfig success------------'))
        await this.addMainProcessFiles()
        console.log(chalk.green('-------------addMainProcessFiles success------------'))

        console.log(chalk.green('-------------create project success------------'))
        console.log()
        console.log()
        console.log(chalk.green(`>cd ${this.projectName}`))
        console.log(chalk.green(`>npm install`))
        console.log(chalk.green(`>npm run serve`))
    }

    async clearProject() {
        fs.removeSync(this.angularProjectPath)
        console.log(chalk.green('-------------clean dir success------------'))
    }

    async initAngularProject() {
        return new Promise(((resolve, reject) => {
            const args = []
            args.push('new')
            args.push(this.projectName)
            args.push('--skipInstall=true')
            args.push('--commit=false')
            args.push('--style=scss')
            args.push('--strict=true')
            args.push('--routing=true')
            args.push('--minimal=true')
            args.push('--force=true')
            args.push('--inline-template=false')
            args.push('--inline-style=false')
            args.push('--skip-git=true')
            args.push('--skip-tests=true')

            const ngProgress = childProcess.spawn('ng', args, {
                cwd: this.execPath,
                env: {
                    ...process.env
                },
                shell: true
            })
            ngProgress.stderr.addListener('data', (data) => {
                console.log(chalk.red(data.toString()))
            })
            ngProgress.stdout.addListener('data', (data) => {
                console.log(chalk.white(data.toString()))
            })

            ngProgress.on('error', (data) => {
                console.log(chalk.red(data.stack))
                reject(data)
            })
            ngProgress.on('close', () => {
                resolve()
            })
        }))
    }

    async addDependencies() {
        const packageJson = fs.readJsonSync(this.angularPackageJsonPath, {
            encoding: 'utf8',
            flag: 'r'
        })
        packageJson.devDependencies = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
            '@miup/ngx-electron-builder': '^' + await latestVersion('@miup/ngx-electron-builder'),
            'electron-builder': '^' + await latestVersion('electron-builder'),
            'electron': '^' + await latestVersion('electron'),
        }
        packageJson.dependencies = {}

        packageJson.scripts = {
            serve: 'ng serve',
            build: 'ng build --prod=true',
            postinstall: 'electron-builder install-app-deps',
            postuninstall: 'electron-builder install-app-deps',
        }

        fs.writeFileSync(this.angularPackageJsonPath, JSON.stringify(packageJson, null, 4), {encoding: 'utf8'})
    }

    async changeAngularConfig() {
        // 2 读取 angular.json 并修改
        let config = fs.readJsonSync(this.angularConfigPath, {
            encoding: 'utf8',
            flag: 'r'
        })

        const afConfig = JSON.stringify(config).replace(/src\//g, this.angularPathChange + '/')
        config = JSON.parse(afConfig)
        const project = config.projects[config.defaultProject]
        project.sourceRoot = this.angularPathChange
        project.architect.build = {
            ...project.architect.build,
            builder: '@miup/ngx-electron-builder:build',
            options: {
                ...project.architect.build.options,
                tsConfig: "tsconfig.render.json",
                mainProcess: "src/main/index.ts",
                mainProcessTsConfig: "tsconfig.main.json",
            }
        }

        project.architect.serve = {
            ...project.architect.serve,
            builder: '@miup/ngx-electron-builder:dev-server'
        }

        fs.writeFileSync(this.angularConfigPath, JSON.stringify(config, null, 4), {encoding: 'utf8'})
    }

    async changeAngularAppPath() {
        // 3 src 移动到 src/render
        fs.moveSync(this.angularRenderSrcPath, this.angularRenderSrcPath + '_back')
        fs.moveSync(this.angularRenderSrcPath + '_back', this.angularRenderSrcAfterPath)
    }

    async changeRenderTsConfig() {
        let configString = fs.readFileSync(this.angularRenderTsConfigPath, {
            encoding: 'utf8',
            flag: 'r'
        })
        const renderConfigJsonAfter = configString.replace(/src/g, this.angularPathChange);
        fs.writeFileSync(this.angularRenderTsConfigAfterPath, renderConfigJsonAfter)
        fs.unlinkSync(this.angularRenderTsConfigPath)
    }

    async addMainProcessFiles() {
        const mainDemoPath = path.join(__dirname, '../default')
        fs.copySync(mainDemoPath, this.angularProjectPath)
    }
}


module.exports = NgxElectronHandler
