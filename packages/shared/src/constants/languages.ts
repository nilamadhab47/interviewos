export interface LanguageConfig {
  id: string;
  name: string;
  monacoId: string;
  judge0Id: number;
  defaultCode: string;
}

export const LANGUAGES: LanguageConfig[] = [
  {
    id: 'javascript',
    name: 'JavaScript',
    monacoId: 'javascript',
    judge0Id: 63,
    defaultCode: `// Welcome to InterviewOS\nconsole.log("Hello, World!");`,
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    monacoId: 'typescript',
    judge0Id: 74,
    defaultCode: `// Welcome to InterviewOS\nconst greeting: string = "Hello, World!";\nconsole.log(greeting);`,
  },
  {
    id: 'python',
    name: 'Python',
    monacoId: 'python',
    judge0Id: 71,
    defaultCode: `# Welcome to InterviewOS\nprint("Hello, World!")`,
  },
  {
    id: 'cpp',
    name: 'C++',
    monacoId: 'cpp',
    judge0Id: 54,
    defaultCode: `// Welcome to InterviewOS\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}`,
  },
  {
    id: 'java',
    name: 'Java',
    monacoId: 'java',
    judge0Id: 62,
    defaultCode: `// Welcome to InterviewOS\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}`,
  },
  {
    id: 'php',
    name: 'PHP',
    monacoId: 'php',
    judge0Id: 68,
    defaultCode: `<?php\n// Welcome to InterviewOS\necho "Hello, World!";`,
  },
  {
    id: 'rust',
    name: 'Rust',
    monacoId: 'rust',
    judge0Id: 73,
    defaultCode: `// Welcome to InterviewOS\nfn main() {\n    println!("Hello, World!");\n}`,
  },
];

export const getLanguageById = (id: string): LanguageConfig | undefined =>
  LANGUAGES.find((l) => l.id === id);

export const getLanguageByJudge0Id = (judge0Id: number): LanguageConfig | undefined =>
  LANGUAGES.find((l) => l.judge0Id === judge0Id);
