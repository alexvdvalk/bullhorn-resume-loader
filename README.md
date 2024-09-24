# Bullhorn Resume Loader

Bullhorn Resume Loader is a command-line tool that allows you to load resumes and create candidate records in Bullhorn. This tool parses resumes from a specified folder and uploads the parsed data to Bullhorn, creating candidate records.

This command will:

1. Log in to the Bullhorn API using the provided username and password.
2. Read all files in the specified `resumeFolder`.
3. Parse each resume file and create a candidate record in Bullhorn.
4. Save the parsed resume data to a JSON file in a `JSON` subfolder within the `resumeFolder`.
5. Move processed resume files to a `processed` subfolder within the `resumeFolder`.
6. Move failed resume files to a `failed` subfolder within the `resumeFolder`.

### Supported File Types

The tool supports the following resume file types:

- `.txt`
- `.doc`
- `.docx`
- `.pdf`

### Required Arguments

- `-u, --username <username>`: Bullhorn API username.
- `-p, --password <password>`: Bullhorn API password.
- `-r, --resumeFolder <resumeFolder>`: Folder containing resumes to be processed.

### Example

npx bullhorn-resume-loader load -u myUsername -p myPassword -r ./resumes

### Output

- Parsed resume data is saved as JSON files in a `JSON` subfolder within the `resumeFolder`.
- Processed resume files are moved to a `processed` subfolder within the `resumeFolder`.
- Failed resume files are moved to a `failed` subfolder within the `resumeFolder`.

### Todo

- Improve performance
- Add logging
- Add error handling
- Add tests

## License

This project is licensed under the MIT License.