export interface ParsedCandidate {
    confidenceScore: string;
    candidate: Candidate;
    candidateEducation: CandidateEducation[];
    candidateWorkHistory: CandidateWorkHistory[];
    skillList: string[];
}

export interface CandidateWorkHistory {
    startDate: number;
    endDate: number;
    companyName: string;
    title: string;
    comments: string;
}

export interface CandidateEducation {
    graduationDate?: number;
    school?: string;
    city?: string;
    state?: string;
    degree: string;
    major?: string;
}

export interface Candidate {
    name: string;
    address: Address;
    occupation: string;
    companyName: string;
    mobile: string;
    firstName: string;
    lastName: string;
    email: string;
    description: string;
    onboardingReceivedSent: OnboardingReceivedSent;
    editHistoryValue: string;
}

interface OnboardingReceivedSent {
    onboardingDocumentReceivedCount: null;
    onboardingDocumentSentCount: null;
}

interface Address {
    address1: null;
    address2: null;
    city: string;
    state: string;
    zip: null;
    countryID: number;
    countryName: null;
    countryCode: null;
    timezone: null;
    latitude: null;
    longitude: null;
}