import axios from 'axios';
import { type LoginResponse } from "./interfaces"


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


