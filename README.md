# StudyVerse

**Your academic life, organised in one place.**

StudyVerse is a responsive student productivity dashboard built with vanilla HTML, CSS and JavaScript. It brings everyday academic planning tools into one clean workspace.

## Features

- **Overview dashboard** — task progress, pending work, attendance average and upcoming exams.
- **Task manager** — create tasks with due dates, subjects and priority; filter and mark tasks complete.
- **Attendance tracker** — record classes attended and total classes for each subject.
- **Exam calendar** — save exam dates and see a live days-left countdown.
- **Focus room** — Pomodoro-style focus, short-break and long-break timer.
- **Notes organiser** — create, edit and delete study notes.
- **Local persistence** — your workspace is saved in the browser using `localStorage`.
- **Responsive layout** — desktop sidebar and mobile navigation.
- **Dark mode** — switch between light and dark themes.

## Tech stack

- HTML5
- CSS3 (custom responsive layout; no CSS framework)
- Vanilla JavaScript
- Browser `localStorage`

## Run locally

No build tools or package installation are required.

1. Clone this repository:
   ```bash
   git clone https://github.com/AgrimaVerma14/StudyVerse.git
   ```
2. Open the project folder.
3. Open `index.html` in a modern browser.

For a local development server, you can use the VS Code Live Server extension or run:
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000`.

## Project structure

```text
StudyVerse/
├── index.html
├── style.css
├── script.js
├── README.md
├── LICENSE
└── .gitignore
```

## Data and privacy

StudyVerse currently stores workspace data locally in the browser on the device where it is used. It does not include a backend, user account system or cloud synchronisation. Clearing browser storage may remove saved StudyVerse data. Do not enter sensitive personal information.

## Roadmap

- [ ] Export and import workspace data as JSON
- [ ] Subject-wise task grouping
- [ ] Weekly study-time analytics
- [ ] Calendar view for assignments and exams
- [ ] Optional cloud sync and authentication

## Author

**Agrima Verma**  
Computer Science & Engineering Student

---

Built as a student productivity project to practise frontend development, DOM manipulation, responsive UI design and browser storage.
