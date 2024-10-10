# Bullhorn Resume Loader

Bullhorn Resume Loader is a command-line tool that allows you to load resumes and create candidate records in Bullhorn. This tool parses resumes from a specified folder and uploads the parsed data to Bullhorn, creating candidate records.

This command will:

1. Log in to the Bullhorn API using the provided username and password.
2. Read all files in the specified `resumeFolder`.
3. Parse each resume file and create a candidate record in Bullhorn.
4. Move processed resume files to a `processed` folder.

### Supported File Types

The tool supports the following resume file types:

- `.txt`
- `.doc`
- `.docx`
- `.pdf`

### Example

`npx bullhorn-resume-loader load`

### Output

- Processed resume files are moved to a `processed` subfolder within the `resumeFolder`.
- Skipped resume files are left in the `resumeFolder`.

### Todo

- Add better logging
- Add tests

## License

This project is licensed under the MIT License.
