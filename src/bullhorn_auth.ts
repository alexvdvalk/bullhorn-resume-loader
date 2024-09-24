import axios from 'axios';

interface LoginResponse {
  identity: Identity;
  sessions: Session[];
  apps: App[];
  requestUrl: string;
  redirectUrl: string;
}

interface App {
  enabled: boolean;
}

interface Session {
  name: string;
  value: Value;
}

interface Value {
  token?: string;
  endpoint: string;
}

interface Identity {
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

export const login = async (username: string, password: string) => {

  const { data } = await axios.get<LoginResponse>('https://universal.bullhornstaffing.com/universal-login/session/login', {
    params: {
      username,
      password
    }
  })
  const rest = data.sessions.find(i => i.name === "rest")
  console.log(`Logged into corporation ${data.identity.corporationName}`)
  return axios.create({
    baseURL: rest?.value.endpoint,
    params: {
      "BhRestToken": rest?.value.token
    }
  })

};


export interface TokenResponse {
  BhRestToken: string;
  restUrl: string;
  time?: string
}

interface FirstTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}
