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
    }

    async run() {
        await this.clearProject()
        await this.initAngularProject()
        await this.changeAngularAppPath()
        await this.addMainProcessFiles()

        console.log(chalk.green('-------------create project success------------'))
        console.log()
        console.log()
        console.log()
        console.log()
        console.log(chalk.green(`>cd ${this.projectName}`))
        console.log(chalk.green(`>npm install`))
        console.log(chalk.green(`>npm run serve`))
    }

    async clearProject() {
        fs.removeSync(path.join(process.cwd(), this.projectName))
    }

    async initAngularProject() {
        console.log(chalk.green('-------------create angular project start------------'))
        return new Promise(((resolve, reject) => {
            const args = []
            args.push('new')
            args.push(this.projectName)
            args.push('--skipInstall=true')
            args.push('--style=scss')
            args.push('--strict=true')
            args.push('--routing=true')
            args.push('--minimal=true')
            args.push('--force=true')

            const ngProgress = childProcess.spawn('ng', args, {
                cwd: process.cwd(),
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
                console.log(chalk.green('-------------create angular project success------------'))
                resolve()
            })
        }))
    }

    async changeAngularAppPath() {
        const angularProjectPath = path.join(process.cwd(), this.projectName)
        const angularConfigPath = path.join(angularProjectPath, 'angular.json')
        const angularPackageJsonPath = path.join(angularProjectPath, 'package.json')
        const angularRenderSrcPath = path.join(angularProjectPath, 'src')
        const angularRenderSrcAfterPath = path.join(angularProjectPath, this.angularPathChange)
        const angularRenderTsConfigPath = path.join(angularProjectPath, 'tsconfig.app.json')
        const angularRenderTsConfigAfterPath = path.join(angularProjectPath, 'tsconfig.render.json')

        // 1 package.json 添加依赖

        const electronBuildName = '@miup/ngx-electron-builder'
        const electronBuildVersion = await latestVersion(electronBuildName)

        const packageJsonStr = fs.readFileSync(angularPackageJsonPath, {
            encoding: 'utf8',
            flag: 'r'
        })

        const packageJson = JSON.parse(packageJsonStr.toString('utf8'))
        packageJson.devDependencies = {
            [electronBuildName]: `^${electronBuildVersion}`,
            ...packageJson.dependencies
        }
        packageJson.dependencies = {}

        packageJson.scripts = {
            serve: 'ng serve',
            build: 'ng build'
        }

        const packageJsonData = JSON.stringify(packageJson, null, 4)
        fs.writeFileSync(angularPackageJsonPath, packageJsonData, {encoding: 'utf8'})

        // 2 读取 angular.json 并修改
        const configJson = fs.readFileSync(angularConfigPath, {
            encoding: 'utf8',
            flag: 'r'
        })

        const bf = configJson.toString('utf8')
        const afConfig = bf.replace(/src/g, this.angularPathChange)
        const config = JSON.parse(afConfig)
        const project = config.projects[config.defaultProject]
        project.architect.build.builder = '@miup/ngx-electron-builder:build'
        project.architect.serve.builder = '@miup/ngx-electron-builder:dev-server'
        project.architect.build.options.mainProcess = "src/main/index.ts"
        project.architect.build.options.mainProcessOutputName = "index.js"
        project.architect.build.options.mainProcessTsConfig = "tsconfig.main.json"
        project.architect.build.options.tsConfig = "tsconfig.render.json"

        fs.writeFileSync(angularConfigPath, JSON.stringify(config, null, 4), {encoding: 'utf8'})

        // 3 src 移动到 src/render
        fs.moveSync(angularRenderSrcPath, angularRenderSrcPath + '_back')
        fs.moveSync(angularRenderSrcPath + '_back', angularRenderSrcAfterPath)

        //4 修改tsconfig.app.json 并移动到tsconfig.render.json
        const renderConfigJson = fs.readFileSync(angularRenderTsConfigPath, {
            encoding: 'utf8',
            flag: 'r'
        })
        const renderConfigJsonAfter = renderConfigJson.replace(/src/g, this.angularPathChange);
        fs.writeFileSync(angularRenderTsConfigAfterPath, renderConfigJsonAfter)
        fs.unlinkSync(angularRenderTsConfigPath)
    }

    async addMainProcessFiles() {
        // add main process files
        const angularProjectPath = path.join(process.cwd(), this.projectName)
        const mainDemoPath = path.join(__dirname, '../default')
        fs.copySync(mainDemoPath, angularProjectPath)
    }
}


module.exports = NgxElectronHandler
