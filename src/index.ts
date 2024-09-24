import { Command } from 'commander';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { login } from './bullhorn_auth';
import { createObjectCsvWriter, createArrayCsvWriter } from 'csv-writer';
import { ParsedCandidate, CandidateEducation, CandidateWorkHistory } from './interfaces';

dotenv.config();


import Bottleneck from "bottleneck";

const limiter = new Bottleneck({
    maxConcurrent: 5,
});
const program = new Command();

// ANSI escape code for pink color
const pink = '\x1b[95m';
const reset = '\x1b[0m';

// Custom console.log function that prints in pink
const pinkLog = (...args: any[]) => {
    console.log(pink, ...args, reset);
};

// Allowed file extensions
const allowedExtensions = ['.txt', '.doc', '.docx', '.pdf'];


program
    .name('bullhorn-resume-processor')
    .description('Process resumes and create candidate records in Bullhorn')
    .version('1.0.0');


program.command('parse-and-upload')
    .description('This command uses the Bullhorn API to parse resumes into JSON format. These files can then be loaded into Bullhorn using the load-from-json command')
    .requiredOption('-u, --username <username>', 'Bullhorn API username')
    .requiredOption('-p, --password <password>', 'Bullhorn API password')
    .requiredOption('-r, --resumeFolder <resumeFolder>', 'Folder containing resumes')
    .action(async (options) => {
        const { username, password, resumeFolder } = options;

        try {
            const api = await login(username, password);
            const files = await fs.readdir(resumeFolder, { withFileTypes: true });

            for (const file of files) {
                if (!file.isFile()) continue; // Skip if not a file

                const fileExtension = path.extname(file.name).toLowerCase();
                if (!allowedExtensions.includes(fileExtension)) {
                    pinkLog(`Skipping file ${file.name}: not a supported file type`);
                    continue; // Skip if not an allowed file type
                }

                const filePath = path.join(resumeFolder, file.name);
                try {
                    const resumeData = await fs.readFile(filePath);
                    const parsedResume = await parseResume(resumeData, file.name, api);
                    // Write parsedResume to a JSON file
                    const jsonFileName = `${path.parse(file.name).name}.json`;
                    const jsonFilePath = path.join(resumeFolder, 'JSON', jsonFileName);
                    await fs.mkdir(path.dirname(jsonFilePath), { recursive: true });
                    await fs.writeFile(jsonFilePath, JSON.stringify(parsedResume, null, 2));
                    pinkLog(`Wrote parsed resume to ${jsonFilePath}`);

                    await loadCandidateToBullhorn(parsedResume, resumeData, file.name, api)
                    // Write data to CSV file

                    pinkLog(`Processed and created candidate for: ${file.name}`);
                    await moveFile(filePath, path.join(resumeFolder, 'processed'));
                } catch (error) {
                    console.error(pink, `Error processing file ${file.name}:`, error, reset);
                    await moveFile(filePath, path.join(resumeFolder, 'failed'));
                }
            }

            pinkLog('All resumes processed');
        } catch (error) {
            console.error(pink, 'Error processing resumes:', error, reset);
        }
    });


// program.command('extract-to-json')
//     .description('This command uses the Bullhorn API to parse resumes into JSON format. These files can then be loaded into Bullhorn using the load-from-json command')
//     .requiredOption('-u, --username <username>', 'Bullhorn API username')
//     .requiredOption('-p, --password <password>', 'Bullhorn API password')
//     .requiredOption('-r, --resumeFolder <resumeFolder>', 'Folder containing resumes')
//     .action(async (options) => {
//         const { username, password, resumeFolder } = options;

//         try {
//             const api = await login(username, password);
//             const files = await fs.readdir(resumeFolder, { withFileTypes: true });

//             for (const file of files) {
//                 if (!file.isFile()) continue; // Skip if not a file

//                 const fileExtension = path.extname(file.name).toLowerCase();
//                 if (!allowedExtensions.includes(fileExtension)) {
//                     pinkLog(`Skipping file ${file.name}: not a supported file type`);
//                     continue; // Skip if not an allowed file type
//                 }

//                 const filePath = path.join(resumeFolder, file.name);
//                 try {
//                     const resumeData = await fs.readFile(filePath);
//                     const parsedResume = await parseResume(resumeData, file.name, api);

//                     // Write parsedResume to a JSON file
//                     const jsonFileName = `${path.parse(file.name).name}.json`;
//                     const jsonFilePath = path.join(resumeFolder, 'JSON', jsonFileName);
//                     await fs.mkdir(path.dirname(jsonFilePath), { recursive: true });
//                     await fs.writeFile(jsonFilePath, JSON.stringify(parsedResume, null, 2));
//                     pinkLog(`Wrote parsed resume to ${jsonFilePath}`);

//                     // Write data to CSV file
//                     await writeToCsv(file.name, jsonFileName, parsedResume);

//                     pinkLog(`Processed and created candidate for: ${file.name}`);
//                     await moveFile(filePath, path.join(resumeFolder, 'processed'));
//                 } catch (error) {
//                     console.error(pink, `Error processing file ${file.name}:`, error, reset);
//                     await moveFile(filePath, path.join(resumeFolder, 'failed'));
//                 }
//             }

//             pinkLog('All resumes processed');
//         } catch (error) {
//             console.error(pink, 'Error processing resumes:', error, reset);
//         }
//     });

const loadCandidateToBullhorn = async (candidate: ParsedCandidate, resumeData: Buffer, fileName: string, api: AxiosInstance) => {

    let cleanedPayload = { ...candidate.candidate as { [key: string]: any } }
    delete cleanedPayload.editHistoryValue;
    delete cleanedPayload.onboardingReceivedSent;
    cleanedPayload.skillSet = candidate.skillList
    const { data } = await api.put('/entity/Candidate', cleanedPayload);
    const candidateId = data.changedEntityId
    await addEducationHistories(candidateId, candidate.candidateEducation, api)
    await addWorkHistories(candidateId, candidate.candidateWorkHistory, api)
    await uploadResumeFiletoCandidate(candidateId, resumeData, fileName, api)
}

const uploadResumeFiletoCandidate = async (id: string, resumeData: Buffer, fileName: string, api: AxiosInstance) => {
    const form = new FormData();
    form.append('file', resumeData, fileName);
    form.append('name', fileName);
    form.append('distribution', 'General');

    const headers = form.getHeaders();
    try {
        await api.put(`/file/Candidate/${id}/raw`, form, { params: { externalID: -1, fileType: "SAMPLE" }, headers })
    } catch (err) {
        pinkLog("Error uploading file", err)
    }

}
const addWorkHistories = async (id: string, workHistory: CandidateWorkHistory[], api: AxiosInstance) => {
    for await (const wh of workHistory) {
        try {

            const { data } = await api.put('/entity/CandidateWorkHistory', {
                candidate: {
                    id
                },
                ...wh
            })
            pinkLog(`added work history ${data.changedEntityId} for candidate ${id}`)
        } catch (err) {
            pinkLog(`Error adding work history`, err)
        }
    }
}

const addEducationHistories = async (id: string, educationHistory: CandidateEducation[], api: AxiosInstance) => {
    for await (let ed of educationHistory) {
        try {
            const { data } = await api.put('/entity/CandidateEducation', {
                candidate: {
                    id
                },
                ...ed
            })
            pinkLog(`added education history ${data.changedEntityId} for candidate ${id}`)
        } catch (err) {
            pinkLog(`Error adding education history`, err)
        }
    }
}

async function parseResume(resumeData: Buffer, fileName: string, api: AxiosInstance) {
    const form = new FormData();
    form.append('file', resumeData, fileName);

    const headers = form.getHeaders();

    const parseResponse = await api.post<ParsedCandidate>(
        'resume/parseToCandidate',
        form,
        {
            headers: {
                ...headers,
            },
            params: {
                format: "text",
                populateDescription: "html"
            }
        }
    );
    return parseResponse.data;
}

async function moveFile(filePath: string, destinationFolder: string) {
    const fileName = path.basename(filePath);
    const destinationPath = path.join(destinationFolder, fileName);

    // Ensure the destination folder exists
    await fs.mkdir(destinationFolder, { recursive: true });

    // Move the file
    await fs.rename(filePath, destinationPath);
    pinkLog(`Moved ${fileName} to ${destinationFolder} folder`);
}

async function writeToCsv(sourceFileName: string, jsonFileName: string, parsedResume: any) {
    const date = new Date().toISOString().split('T')[0]; // Get the current date in YYYY-MM-DD format
    const csvFilePath = `candidates_${date}.csv`;

    // Check if the CSV file exists
    const fileExists = await fs.access(csvFilePath).then(() => true).catch(() => false);
    const candidate = parsedResume.candidate;
    const candidateFields = {
        "name": candidate.name,
        "occupation": candidate.occupation,
        "companyName": candidate.companyName,
        "mobile": candidate.mobile,
        "firstName": candidate.firstName,
        "lastName": candidate.lastName,
        "email": candidate.email,
        "confidenceScore": parsedResume.confidenceScore,
    }
    // Create the CSV writer
    const csvWriter = createObjectCsvWriter({
        path: csvFilePath,
        header: [
            { id: 'sourceFileName', title: 'Source File' },
            { id: 'jsonFileName', title: 'JSON File' },
            ...Object.keys(candidateFields).map(key => ({ id: key, title: key }))
        ],
        append: true
    });

    // If the file doesn't exist, write the header
    if (!fileExists) {
        const headerWriter = createArrayCsvWriter({
            path: csvFilePath,
            header: [
                'Source File',
                'JSON File',
                ...Object.keys(candidateFields)
            ]
        });
        await headerWriter.writeRecords([[]]); // Write the header
    }

    // Write the record
    const record = {
        sourceFileName,
        jsonFileName,
        ...candidateFields
    };

    await csvWriter.writeRecords([record]);
    pinkLog(`Appended data to ${csvFilePath}`);
}

program.parse();