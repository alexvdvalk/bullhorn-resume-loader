#! /usr/bin/env node

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
// import { type AxiosInstance } from 'axios';
import { login } from './bullhorn_auth.js';
// import { createObjectCsvWriter, createArrayCsvWriter } from 'csv-writer';
import figlet from "figlet";
import inquirer from 'inquirer';
import chalk from 'chalk';
import BullhornAPI from './BullhornAPI.js';
import { Dirent } from 'fs';



import Bottleneck from "bottleneck";

const limiter = new Bottleneck({
    maxConcurrent: 5,
});
const program = new Command();

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\nSIGTERM received. Starting shutdown procedure...'));
    shutdownProcedure();
})

process.on('SIGINT', () => {
    console.log(chalk.yellow('\nCtrl+C detected. Starting shutdown procedure...'));
    shutdownProcedure();
})

const shutdownProcedure = () => {
    console.log(chalk.red('*** Close Signal received ****'));
    const counts = limiter.counts();
    // console.log(counts)
    if (counts.EXECUTING === 0) {
        console.log(chalk.red('No tasks running, exiting...'));
        process.exit(0);
    }
    console.log(chalk.red('Waiting for all pending tasks...'));
    limiter.stop({
        dropWaitingJobs: true,
    }).then(() => {
        console.log('All pending tasks have been stopped.');
    }).catch((error) => {
        console.error('Error stopping tasks:', error);
    })
        .finally(() => {
            console.log(chalk.green('Shutdown procedure complete. Exiting...'));
            process.exit(0);
        })
}
console.log(figlet.textSync("Resume Loader"));

// Allowed file extensions
const allowedExtensions = ['.txt', '.doc', '.docx', '.pdf'];

program
    .name('bullhorn-resume-loader')
    .description(`Load resumes and create candidate records in Bullhorn
Author: Alex van der Valk
LinkedIn: https://www.linkedin.com/in/alexvdvalk/`)
    .version('1.0.0');

program.command('load')
    .description('Parse and create candidates for all the resumes in a folder')
    // .option('-u, --username <username>', 'Bullhorn API username')
    // .option('-p, --password <password>', 'Bullhorn API password')
    .action(async () => {
        // let { username, password } = options;


        await login()

        const resumeFolder = await getResumeFolder()

        const files = await getResumeList(resumeFolder)
        if (!files) {
            console.log(chalk.red("No compatible files found in the specified folder", resumeFolder))
            return
        }
        console.log(chalk.blue(`Found ${files.length} compatible file${files.length > 1 ? "s" : ""}`))

        let response
        try {
            response = await inquirer.prompt([{
                type: 'confirm',
                name: 'skipDuplicates',
                message: 'Do you want to skip duplicates?',
                default: true
            }, {
                type: 'confirm',
                name: 'skipNoemail',
                message: 'Do you want to skip candidates with no email?',
                default: true
            },
            {
                type: 'input',
                name: 'preocessedFileList',
                message: 'Enter the folder for processed files',
                default: './processed',
                validate: (input) => input.length > 0
            },
            {
                type: 'number',
                name: 'maxConcurrent',
                message: 'Enter the maximum number of concurrent requests. This will set the number of files to be processed at a time',
                default: 5,
                validate: (input) => input! > 0
            }])
        } catch (error) {
            if (error instanceof Error && error.name === 'ExitPromptError') {
                console.log(chalk.yellow('cancelled.'));
                process.exit(0);
            }
            throw error;
        }
        const { skipDuplicates, skipNoemail, preocessedFileList, maxConcurrent } = response



        limiter.updateSettings({ maxConcurrent })
        // try {
        if (!files) {
            console.log(chalk.red('No compatible files found in the specified folder', resumeFolder))
            process.exit(0)
        };
        for (const file of files) {


            const filePath = path.join(resumeFolder, file.name);
            const resumeData = await fs.readFile(filePath);

            limiter.schedule(() => BullhornAPI.createCandidate(resumeData, file.name, skipDuplicates, skipNoemail)
                .then(newCand => {
                    console.log(chalk.green(`Candidate created with ID: ${newCand.changedEntityId}`))
                    return moveFile(filePath, preocessedFileList)
                }).catch(err => {
                    console.error(chalk.red(err))
                })
            ).catch(() => {
                // console.error(chalk.red(err))
            })
        }
    });


const getResumeFolder = async () => {
    let resumeFolder
    try {

        const response = await inquirer.prompt([{
            type: 'input',
            name: 'resumeFolder',
            message: 'Enter the folder containing the resumes',
            validate: (input) => input.length > 0
        }])
        resumeFolder = response.resumeFolder
    } catch (error) {
        if (error instanceof Error && error.name === 'ExitPromptError') {
            console.log(chalk.yellow('\nCancelled.'));
            process.exit(0);
        }
    }

    try {
        const folderExists = await fs.access(resumeFolder)
            .then(() => true)
            .catch(() => false);

        if (!folderExists) {
            console.error(chalk.red(`The specified resume folder does not exist: ${resumeFolder} `));
            throw new Error('Resume folder not found');
        }

        console.log(chalk.green(`Resume folder found: ${resumeFolder} `));
        return resumeFolder;
    } catch {
        console.error(chalk.red(`Error reading resume folder. Specify the folder in relation to the current working directory`))
        return await getResumeFolder()
    }

}
const getResumeList = async (resumeFolder: string) => {
    try {
        const files: Dirent[] = await fs.readdir(resumeFolder, { withFileTypes: true })
        return files
            .filter(file => {
                return file.isFile() && allowedExtensions.includes(path.extname(file.name).toLowerCase())
            })
    } catch {
        console.error(chalk.red(`Error reading resume folder.Specify the folder in relation to the current working directory`))
    }
}

async function moveFile(filePath: string, destinationFolder: string) {
    const fileName = path.basename(filePath);
    const destinationPath = path.join(destinationFolder, fileName);

    // Ensure the destination folder exists
    await fs.mkdir(destinationFolder, { recursive: true });

    // Move the file
    await fs.rename(filePath, destinationPath);
    console.log(chalk.green(`Moved ${fileName} to ${destinationFolder} folder`));
}

// async function writeToCsv(sourceFileName: string, jsonFileName: string, parsedResume: any) {
//     const date = new Date().toISOString().split('T')[0]; // Get the current date in YYYY-MM-DD format
//     const csvFilePath = `candidates_${date}.csv`;

//     // Check if the CSV file exists
//     const fileExists = await fs.access(csvFilePath).then(() => true).catch(() => false);
//     const candidate = parsedResume.candidate;
//     const candidateFields = {
//         "name": candidate.name,
//         "occupation": candidate.occupation,
//         "companyName": candidate.companyName,
//         "mobile": candidate.mobile,
//         "firstName": candidate.firstName,
//         "lastName": candidate.lastName,
//         "email": candidate.email,
//         "confidenceScore": parsedResume.confidenceScore,
//     }
//     // Create the CSV writer
//     const csvWriter = createObjectCsvWriter({
//         path: csvFilePath,
//         header: [
//             { id: 'sourceFileName', title: 'Source File' },
//             { id: 'jsonFileName', title: 'JSON File' },
//             ...Object.keys(candidateFields).map(key => ({ id: key, title: key }))
//         ],
//         append: true
//     });

//     // If the file doesn't exist, write the header
//     if (!fileExists) {
//         const headerWriter = createArrayCsvWriter({
//             path: csvFilePath,
//             header: [
//                 'Source File',
//                 'JSON File',
//                 ...Object.keys(candidateFields)
//             ]
//         });
//         await headerWriter.writeRecords([[]]); // Write the header
//     }

//     // Write the record
//     const record = {
//         sourceFileName,
//         jsonFileName,
//         ...candidateFields
//     };

//     await csvWriter.writeRecords([record]);
//     pinkLog(`Appended data to ${csvFilePath} `);
// }

program.parse();