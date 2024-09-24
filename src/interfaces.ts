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

export interface OnboardingReceivedSent {
    onboardingDocumentReceivedCount: null;
    onboardingDocumentSentCount: null;
}

export interface Address {
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

export interface LoginResponse {
    identity: Identity;
    sessions: Session[];
    apps: App[];
    requestUrl: string;
    redirectUrl: string;
}

export interface App {
    enabled: boolean;
}

export interface Session {
    name: string;
    value: Value;
}

export interface Value {
    token?: string;
    endpoint: string;
}

export interface Identity {
    username: string;
    masterUserId: number;
    userId: number;
    corporationId: number;
    privateLabelId: number;
    userTypeId: number;
    userPrimaryDepartmentId: number;
    swimLaneId: number;
    dataCenterId: number;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    locale: string;
    corporationName: string;
    allPrivateLabelIds: number[];
    isPasswordCaseSensitive: boolean;
    eStaffAgencyId: string;
    userTypeName: string;
    departmentName: string;
}

export interface TokenResponse {
    BhRestToken: string;
    restUrl: string;
    time?: string
}