import axios from 'axios';
import { type LoginResponse } from "./interfaces"


export const login = async (username: string, password: string) => {

  try {

    const { data } = await axios.get<LoginResponse>('https://universal.bullhornstaffing.com/universal-login/session/login', {
      timeout: 5000,
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
  } catch {
    console.error('Unable to login to Bullhorn. Please check your credentials and try again.')
    process.exit(1);
  }


};


