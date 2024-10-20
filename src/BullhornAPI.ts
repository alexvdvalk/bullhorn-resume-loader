import Bottleneck from 'bottleneck';
import axios, { AxiosRequestConfig } from 'axios';
import chalk from 'chalk';
import FormData from 'form-data';
import type { CandidateEducation, CandidateWorkHistory, CreateCandidateResponse, DuplicateCandidateResponse, ParsedCandidate } from './interfaces.js';





class BullhornAPI {
    private client = axios.create();
    limiter: Bottleneck;
    initialized = false;

    constructor() {
        this.limiter = new Bottleneck({
            maxConcurrent: 35,
            minTime: 50,
        });
        // Listen to the "failed" event
        this.limiter.on("failed", async (error, jobInfo) => {
            const id = jobInfo.options.id;
            console.warn(chalk.red(`Job ${id} failed: ${error}`));

            if (jobInfo.retryCount < 5) { // Here we only retry once
                console.log(`Retrying job ${id} in 1000ms!`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return 1000;
            }
        });
        // Listen to the "retry" event
        this.limiter.on("retry", (error, jobInfo) => console.log(chalk.blue(`Now retrying ${jobInfo.options.id}`)));

    }

    init(url: string, token: string) {
        this.client.defaults.baseURL = url;
        this.client.defaults.params = {
            BhRestToken: token
        }
        this.initialized = true
    }

    get<T>(url: string, config: AxiosRequestConfig) {
        return this.limiter.schedule(() => this.client.get<T>(url, config).then(res => res.data))
    }
    post<T>(url: string, postData: { [key: string]: unknown } | FormData, config: AxiosRequestConfig) {
        return this.limiter.schedule(() => this.client.post<T>(url, postData, config).then(res => res.data))
    }
    put<T>(url: string, postData: { [key: string]: unknown } | FormData, config: AxiosRequestConfig) {
        return this.limiter.schedule(() => this.client.put<T>(url, postData, config).then(res => res.data))
    }

    async searchCandidatebyEmail(email: string) {
        const d = await this.get<DuplicateCandidateResponse[]>(`lookup`, {
            params: {
                entity: "Candidate",
                filter: email
            }
        })
        return d
    }

    async parseResume(resumeData: Buffer, fileName: string) {
        const form = new FormData();
        form.append('file', resumeData, fileName);

        const headers = form.getHeaders();

        const parseResponse = await this.post<ParsedCandidate>(
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
        return parseResponse;
    }

    async createCandidate(resumeData: Buffer, fileName: string, checkforDupe = false, skipNoemail = false) {
        console.log(chalk.green(`Parsing: ${fileName}`))
        const candidate = await this.parseResume(resumeData, fileName);

        if (skipNoemail && !candidate.candidate.email) {
            throw new Error(`File ${fileName} has no email, skipping`);
        }

        if (checkforDupe) {
            console.log(chalk.green(`Checking for duplicates for ${candidate.candidate.email}`))
            const dupe = await this.searchCandidatebyEmail(candidate.candidate.email)
            if (dupe.length > 0) {
                throw new Error(`Candidate ${candidate.candidate.email} already exists with ID ${dupe[0]._id}`)
            }

        }
        const cleanedPayload: Partial<typeof candidate.candidate> & { skillSet?: string[] } = { ...candidate.candidate, skillSet: candidate.skillList }
        delete cleanedPayload.editHistoryValue
        delete cleanedPayload.onboardingReceivedSent
        const createdResponse = await this.put<CreateCandidateResponse>('entity/Candidate', cleanedPayload, {})
        console.log(chalk.green("Adding candidate extras", createdResponse.changedEntityId))
        await Promise.allSettled([
            this.addEducationHistories(createdResponse.changedEntityId, candidate.candidateEducation),
            this.addWorkHistories(createdResponse.changedEntityId, candidate.candidateWorkHistory),
            this.uploadResumeFiletoCandidate(createdResponse.changedEntityId, resumeData, fileName)
        ])
        console.log(chalk.green(`Added extras for ${createdResponse.changedEntityId}`))
        return createdResponse
    }

    async addEducationHistories(candidateId: number, educationHistory: CandidateEducation[]) {
        const educationHistoryData = educationHistory.map(ed => ({
            candidate: {
                id: candidateId
            },
            ...ed
        }));
        return educationHistoryData.map(data =>
            this.put('entity/CandidateEducation', data, {})
        )

    }
    async addWorkHistories(candidateId: number, workHistory: CandidateWorkHistory[]) {
        const workHistoryData = workHistory.map(wh => ({
            candidate: {
                id: candidateId
            },
            ...wh
        }))
        return workHistoryData.map(wh => this.put('entity/CandidateWorkHistory', wh, {}))
    }

    async uploadResumeFiletoCandidate(id: number, resumeData: Buffer, fileName: string) {
        const form = new FormData();
        form.append('file', resumeData, fileName);
        form.append('name', fileName);
        form.append('distribution', 'General');

        const headers = form.getHeaders();
        try {
            await this.put(`/file/Candidate/${id}/raw`, form, { params: { externalID: -1, fileType: "SAMPLE" }, headers })
        } catch (err) {
            console.error(chalk.red("Error uploading file", err))
        }

    }





}


export default new BullhornAPI()
