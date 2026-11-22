const STORAGE_KEY = "studyverse-v1";
const defaultData = { name: "Student", tasks: [], subjects: [], exams: [], notes: [], theme: "light" };
let data = loadData();
let taskFilter = "all";
let noteEditingId = null;
let timerSeconds = 25 * 60;
let timerInitial = timerSeconds;
let timerInterval = null;
let timerRunning = false;
let timerMode = "Focus";

function loadData() {
  try { return { ...defaultData, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; }
  catch { return structuredClone(defaultData); }
}
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderAll();
}
function uid() { return `${Date.now()}-${Math.random().toString(16).slice(2,8)}`; }
function escapeHTML(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function formatDate(value, options={day:"numeric",month:"short",year:"numeric"}) {
  if (!value) return "No due date";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, options);
}
function daysUntil(value) {
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(`${value}T00:00:00`);
  return Math.ceil((target - today) / 86400000);
}
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message; toast.classList.add("show");
  clearTimeout(showToast.timeout); showToast.timeout = setTimeout(()=>toast.classList.remove("show"),2300);
}
function openDialog(id) { document.getElementById(id).showModal(); }
function closeDialogs() { document.querySelectorAll("dialog").forEach(d=>d.close()); }
function setView(view) {
  document.querySelectorAll(".view").forEach(el=>el.classList.toggle("active", el.id === `view-${view}`));
  document.querySelectorAll(".nav-link").forEach(el=>el.classList.toggle("active", el.dataset.view === view));
  const label = ({overview:"Overview",tasks:"My tasks",attendance:"Attendance",exams:"Exams",focus:"Focus room",notes:"Notes"})[view] || "Overview";
  document.getElementById("breadcrumbCurrent").textContent = label;
  document.getElementById("sidebar").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
}
function renderAll() {
  document.getElementById("profileName").textContent = data.name;
  document.getElementById("welcomeName").textContent = data.name;
  document.getElementById("taskNavCount").textContent = data.tasks.filter(t=>!t.done).length;
  document.getElementById("completedStat").textContent = data.tasks.filter(t=>t.done).length;
  document.getElementById("pendingStat").textContent = data.tasks.filter(t=>!t.done).length;
  const attendance = data.subjects.length ? Math.round(data.subjects.reduce((sum,s)=>sum+(s.total ? s.attended/s.total*100 : 0),0)/data.subjects.length) : null;
  document.getElementById("attendanceStat").innerHTML = attendance === null ? "—<small>%</small>" : `${attendance}<small>%</small>`;
  document.getElementById("examStat").textContent = data.exams.filter(e=>daysUntil(e.date)>=0).length;
  const total = data.tasks.length, done = data.tasks.filter(t=>t.done).length;
  const percent = total ? Math.round(done/total*100) : 0;
  document.getElementById("weeklyPercent").textContent = `${percent}%`;
  document.getElementById("weeklyBar").style.width = `${percent}%`;
  renderTasks(); renderAttendance(); renderExams(); renderNotes(); renderUpcoming();
}
function taskMarkup(task) {
  return `<div class="task-item ${task.done?"is-done":""}">
    <button class="task-check ${task.done?"checked":""}" data-toggle-task="${task.id}" aria-label="${task.done?"Mark pending":"Mark complete"}">${task.done?"✓":""}</button>
    <div class="task-main"><strong>${escapeHTML(task.title)}</strong><small>${escapeHTML(task.subject || "General")} · ${task.due ? formatDate(task.due) : "No due date"}</small></div>
    <span class="priority-tag ${task.priority}">${task.priority}</span>
    <button class="delete-button" data-delete-task="${task.id}" aria-label="Delete task">×</button>
  </div>`;
}
function renderTasks() {
  const pending = data.tasks.filter(t=>!t.done);
  const priorities = [...pending].sort((a,b)=>({High:0,Medium:1,Low:2}[a.priority]-({High:0,Medium:1,Low:2}[b.priority]))).slice(0,4);
  const priorityList = document.getElementById("priorityList");
  priorityList.className = priorities.length ? "task-list" : "task-list empty-state";
  priorityList.innerHTML = priorities.length ? priorities.map(taskMarkup).join("") : `<div class="empty-icon">✦</div><strong>Nothing on your list yet</strong><p>Add a task and make today count.</p><button class="secondary-button" data-open-task>＋ Add your first task</button>`;
  const filtered = data.tasks.filter(t=>taskFilter==="all" || (taskFilter==="active"?!t.done:t.done));
  const all = document.getElementById("allTasksList");
  all.className = filtered.length ? "task-list" : "task-list empty-state";
  all.innerHTML = filtered.length ? filtered.map(taskMarkup).join("") : `<div class="empty-icon">☑</div><strong>${taskFilter==="completed"?"No completed tasks yet":"Your task list is clear"}</strong><p>Add assignments, revision goals or reminders.</p>`;
  document.getElementById("taskSummary").textContent = `${data.tasks.length} task${data.tasks.length===1?"":"s"} total`;
}
function renderAttendance() {
  const grid = document.getElementById("attendanceGrid");
  if (!data.subjects.length) { grid.innerHTML = `<div class="panel empty-state" style="grid-column:1/-1"><div class="empty-icon">◷</div><strong>No subjects added</strong><p>Add your subjects and enter attended / total classes.</p></div>`; return; }
  grid.innerHTML = data.subjects.map(s=>{
    const pct = s.total ? Math.round(s.attended/s.total*100) : 0;
    return `<article class="attendance-card"><div class="attendance-card-top"><h3>${escapeHTML(s.name)}</h3><div class="card-actions"><button class="small-action" data-edit-subject="${s.id}">Edit</button><button class="small-action" data-delete-subject="${s.id}">Remove</button></div></div><div class="attendance-percent">${pct}%</div><div class="attendance-bar"><span style="width:${Math.min(pct,100)}%"></span></div><div class="attendance-meta"><span>${s.attended} attended</span><span>${s.total} total classes</span></div></article>`;
  }).join("");
}
function renderExams() {
  const grid = document.getElementById("examList");
  const exams = [...data.exams].sort((a,b)=>a.date.localeCompare(b.date));
  if (!exams.length) { grid.innerHTML = `<div class="panel empty-state" style="grid-column:1/-1"><div class="empty-icon">▤</div><strong>Your exam calendar is empty</strong><p>Add an exam date to start your countdown.</p></div>`; return; }
  grid.innerHTML = exams.map(e=>{
    const days = daysUntil(e.date);
    const count = days < 0 ? "Completed" : days===0 ? "Today" : `${days} <small>days left</small>`;
    return `<article class="exam-card"><div class="exam-card-top"><p class="exam-date">${formatDate(e.date,{weekday:"short",day:"numeric",month:"long",year:"numeric"})}</p><button class="delete-button" data-delete-exam="${e.id}" aria-label="Delete exam">×</button></div><h3>${escapeHTML(e.name)}</h3><div class="exam-count">${count}</div><div class="exam-detail">${escapeHTML(e.details || "Stay consistent with your preparation.")}</div></article>`;
  }).join("");
}
function renderUpcoming() {
  const box = document.getElementById("upcomingList");
  const items = [
    ...data.tasks.filter(t=>!t.done && t.due).map(t=>({title:t.title,date:t.due,type:"Task"})),
    ...data.exams.filter(e=>daysUntil(e.date)>=0).map(e=>({title:e.name,date:e.date,type:"Exam"}))
  ].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
  box.className = items.length ? "upcoming-list" : "upcoming-list empty-inline";
  box.innerHTML = items.length ? items.map(i=>`<div class="upcoming-item"><div class="upcoming-date">${i.type} · ${formatDate(i.date,{day:"numeric",month:"short"})}</div><strong>${escapeHTML(i.title)}</strong><small>${daysUntil(i.date)===0?"Due today":daysUntil(i.date)<0?"Past due":`${daysUntil(i.date)} days from now`}</small></div>`).join("") : "No upcoming deadlines yet. Add an assignment or exam to see it here.";
}
function renderNotes() {
  const grid = document.getElementById("notesGrid");
  if (!data.notes.length) { grid.innerHTML = `<div class="panel empty-state" style="grid-column:1/-1"><div class="empty-icon">▧</div><strong>Your notes live here</strong><p>Capture a useful concept, class note or idea.</p></div>`; return; }
  grid.innerHTML = [...data.notes].sort((a,b)=>b.updated-a.updated).map(n=>`<article class="note-card"><div class="attendance-card-top"><h3>${escapeHTML(n.title)}</h3><div class="card-actions"><button class="small-action" data-edit-note="${n.id}">Edit</button><button class="small-action" data-delete-note="${n.id}">Delete</button></div></div><p>${escapeHTML(n.body || "No note content yet.")}</p><div class="note-date">Updated ${new Date(n.updated).toLocaleDateString()}</div></article>`).join("");
}
function renderDate() {
  const now = new Date();
  document.getElementById("todayLabel").textContent = now.toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"});
  document.getElementById("fullDate").textContent = now.toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
}
function addTask(event) {
  event.preventDefault();
  const title = document.getElementById("taskTitle").value.trim();
  if (!title) return;
  data.tasks.unshift({id:uid(),title,due:document.getElementById("taskDue").value,priority:document.getElementById("taskPriority").value,subject:document.getElementById("taskSubject").value.trim(),done:false});
  event.target.reset(); closeDialogs(); saveData(); showToast("Task added to your list.");
}
function addSubject(event) {
  event.preventDefault();
  const name=document.getElementById("subjectName").value.trim(), attended=Number(document.getElementById("classesAttended").value), total=Number(document.getElementById("classesTotal").value);
  if (!name || attended<0 || total<attended) { showToast("Check the class numbers and try again."); return; }
  data.subjects.push({id:uid(),name,attended,total}); event.target.reset(); closeDialogs(); saveData(); showToast("Subject saved.");
}
function addExam(event) {
  event.preventDefault();
  const name=document.getElementById("examName").value.trim(), date=document.getElementById("examDate").value;
  if(!name||!date)return;
  data.exams.push({id:uid(),name,date,details:document.getElementById("examDetails").value.trim()}); event.target.reset(); closeDialogs(); saveData(); showToast("Exam added to your calendar.");
}
function addNote(event) {
  event.preventDefault();
  const title=document.getElementById("noteTitle").value.trim(), body=document.getElementById("noteBody").value.trim();
  if(!title)return;
  if(noteEditingId){const note=data.notes.find(n=>n.id===noteEditingId); if(note){note.title=title;note.body=body;note.updated=Date.now();}}
  else data.notes.push({id:uid(),title,body,updated:Date.now()});
  noteEditingId=null; event.target.reset(); closeDialogs(); saveData(); showToast("Note saved.");
}
function resetTimer() { clearInterval(timerInterval); timerRunning=false; timerSeconds=timerInitial; updateTimer(); document.getElementById("timerStart").textContent="Start focus"; }
function updateTimer() {
  const m=String(Math.floor(timerSeconds/60)).padStart(2,"0"), s=String(timerSeconds%60).padStart(2,"0");
  document.getElementById("timerDisplay").textContent=`${m}:${s}`;
  const elapsed=timerInitial-timerSeconds, progress=timerInitial?elapsed/timerInitial:0;
  document.getElementById("timerRing").style.background=`conic-gradient(var(--primary) ${progress*360}deg,#eeeff6 0deg)`;
}
function setTimer(minutes, mode) {
  resetTimer(); timerMode=mode; timerSeconds=minutes*60; timerInitial=timerSeconds;
  document.getElementById("timerModeLabel").textContent=`${mode.toUpperCase()} SESSION`;
  document.getElementById("timerHint").textContent=mode==="Focus"?"25 minutes of focused work. You've got this.":"Take a moment to reset and recharge.";
  document.querySelectorAll("#timerModes button").forEach(b=>b.classList.toggle("selected",b.dataset.mode===mode));
  updateTimer();
}
document.addEventListener("click", event=>{
  const nav=event.target.closest("[data-view]"); if(nav){setView(nav.dataset.view);return;}
  const go=event.target.closest("[data-go]"); if(go){setView(go.dataset.go);return;}
  if(event.target.closest("[data-open-task]")||event.target.closest("#quickAddBtn")){openDialog("taskDialog");return;}
  const toggle=event.target.closest("[data-toggle-task]"); if(toggle){const t=data.tasks.find(x=>x.id===toggle.dataset.toggleTask);if(t)t.done=!t.done;saveData();return;}
  const delTask=event.target.closest("[data-delete-task]");if(delTask){data.tasks=data.tasks.filter(t=>t.id!==delTask.dataset.deleteTask);saveData();showToast("Task removed.");return;}
  const delSubject=event.target.closest("[data-delete-subject]");if(delSubject){data.subjects=data.subjects.filter(s=>s.id!==delSubject.dataset.deleteSubject);saveData();return;}
  const editSubject=event.target.closest("[data-edit-subject]");if(editSubject){const s=data.subjects.find(x=>x.id===editSubject.dataset.editSubject);if(!s)return;const attended=prompt("Classes attended:",s.attended);if(attended===null)return;const total=prompt("Total classes:",s.total);if(total===null)return;const a=Number(attended),t=Number(total);if(Number.isInteger(a)&&Number.isInteger(t)&&a>=0&&t>=a){s.attended=a;s.total=t;saveData();}else showToast("Enter valid class numbers.");return;}
  const delExam=event.target.closest("[data-delete-exam]");if(delExam){data.exams=data.exams.filter(e=>e.id!==delExam.dataset.deleteExam);saveData();return;}
  const delNote=event.target.closest("[data-delete-note]");if(delNote){data.notes=data.notes.filter(n=>n.id!==delNote.dataset.deleteNote);saveData();return;}
  const editNote=event.target.closest("[data-edit-note]");if(editNote){const n=data.notes.find(x=>x.id===editNote.dataset.editNote);if(!n)return;noteEditingId=n.id;document.getElementById("noteDialogTitle").textContent="Edit note";document.getElementById("noteTitle").value=n.title;document.getElementById("noteBody").value=n.body;openDialog("noteDialog");return;}
  if(event.target.closest("#addSubjectBtn"))openDialog("subjectDialog");
  if(event.target.closest("#addExamBtn"))openDialog("examDialog");
  if(event.target.closest("#addNoteBtn")){noteEditingId=null;document.getElementById("noteDialogTitle").textContent="New note";document.getElementById("noteForm").reset();openDialog("noteDialog");}
  if(event.target.closest("#editNameBtn")){const name=prompt("What should StudyVerse call you?",data.name);if(name&&name.trim()){data.name=name.trim().slice(0,30);saveData();}}
  if(event.target.closest("#menuBtn"))document.getElementById("sidebar").classList.toggle("open");
  if(event.target.closest("#themeBtn")){data.theme=data.theme==="dark"?"light":"dark";document.body.classList.toggle("dark",data.theme==="dark");localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}
});
document.getElementById("taskFilters").addEventListener("click",e=>{const b=e.target.closest("[data-filter]");if(!b)return;taskFilter=b.dataset.filter;document.querySelectorAll("#taskFilters button").forEach(x=>x.classList.toggle("selected",x===b));renderTasks();});
document.querySelectorAll(".close-dialog").forEach(b=>b.addEventListener("click",closeDialogs));
document.querySelectorAll("dialog").forEach(d=>d.addEventListener("click",e=>{if(e.target===d)d.close();}));
document.getElementById("taskForm").addEventListener("submit",addTask);
document.getElementById("subjectForm").addEventListener("submit",addSubject);
document.getElementById("examForm").addEventListener("submit",addExam);
document.getElementById("noteForm").addEventListener("submit",addNote);
document.getElementById("timerModes").addEventListener("click",e=>{const b=e.target.closest("[data-minutes]");if(b)setTimer(Number(b.dataset.minutes),b.dataset.mode);});
document.getElementById("timerStart").addEventListener("click",()=>{
  if(timerRunning){clearInterval(timerInterval);timerRunning=false;document.getElementById("timerStart").textContent="Resume";return;}
  timerRunning=true;document.getElementById("timerStart").textContent="Pause";
  timerInterval=setInterval(()=>{timerSeconds--;updateTimer();if(timerSeconds<=0){clearInterval(timerInterval);timerRunning=false;document.getElementById("timerStart").textContent="Start again";showToast(`${timerMode} session complete. Well done!`);}},1000);
});
document.getElementById("timerReset").addEventListener("click",resetTimer);
document.body.classList.toggle("dark",data.theme==="dark");
renderDate();renderAll();
