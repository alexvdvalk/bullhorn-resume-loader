import axios from 'axios';
import { type LoginResponse } from "./interfaces"
import inquirer from 'inquirer';
import chalk from 'chalk';
import BullhornAPI from './BullhornAPI';
import ora from 'ora';

export const login = async () => {

  let response;
  try {
    response = await inquirer.prompt([{
      type: 'input',
      name: 'username',
      message: 'Enter your Bullhorn API username',
      validate: (input) => input.length > 0
    }, {
      type: 'password',
      name: 'password',
      message: 'Enter your Bullhorn API password',
      validate: (input) => input.length > 0
    }]);
  } catch (error) {
    if (error instanceof Error && error.name === 'ExitPromptError') {
      console.log(chalk.yellow('\nLogin process cancelled.'));
      process.exit(0);
    }
    throw error;
  }
  const { username, password } = response;


  const spinner = ora('Logging in...').start();
  try {

    const { data } = await axios.get<LoginResponse>('https://universal.bullhornstaffing.com/universal-login/session/login', {
      timeout: 3000,
      params: {
        username,
        password
      }
    });
    const rest = data.sessions.find(i => i.name === "rest")
    spinner.succeed(chalk.green(`Logged into corporation ${data.identity.corporationName}`));
    if (rest?.value.endpoint && rest?.value.token) {
      BullhornAPI.init(rest.value.endpoint, rest.value.token)
    }
  } catch (error) {
    spinner.fail(chalk.red('Login failed'));
    await login()
  }

}


