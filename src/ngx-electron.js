const program = require('commander')
const pkg = require('../package')
const chalk = require('chalk')
const NgxElectronHandler = require('./ngx-electron-handler')

/**
 * version
 */
program

    // ngx-electron -V   |  ngx electron --version
    .version(chalk.green(`${pkg.version}`))

program.command('init <project-name>').alias('i').description('init angular electron project')
    .action((projectName, cmd) => {
        new NgxElectronHandler(projectName, cmd).run().then()
    })

program.parse(process.argv)
