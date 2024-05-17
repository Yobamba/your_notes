import * as fs from 'fs';

class Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    title: string,
    content: string,
    id?: string,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.id = id || this.generateUniqueId();
    this.title = title;
    this.content = content;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  update(title: string, content: string) {
    this.title = title;
    this.content = content;
    this.updatedAt = new Date();
  }

  getInfo(): string {
    return `
      ID: ${this.id}
      Title: ${this.title}
      Content: ${this.content}
      Created At: ${this.createdAt}
      Updated At: ${this.updatedAt}
    `;
  }

  private generateUniqueId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

class NotesManager {
  notes: Note[];
  private undoStack: {action: string; data?: any; subActions?: any[]}[];
  private redoStack: {action: string; data?: any; subActions?: any[]}[];

  constructor() {
    this.notes = [];
    this.undoStack = [];
    this.redoStack = [];
  }

  addNoteWithoutStacking(note: Note) {
    this.notes.push(note);
    this.printOperationResult(`Note "${note.title}" added.`);
  }

  addNote(note: Note) {
    this.notes.push(note);
    this.undoStack.push({action: 'addNote', data: {note}});
    this.redoStack = []; // Clear redo stack when new action is performed
    this.printOperationResult(`Note "${note.title}" added.`);
  }

  listNotes(): string {
    let result = '';
    this.notes.forEach(note => {
      result += note.getInfo() + '\n\n';
    });
    return result;
  }

  getNoteById(noteId: string): Note | undefined {
    return this.notes.find(note => note.id === noteId);
  }

  deleteNoteById(noteId: string) {
    const index = this.notes.findIndex(note => note.id === noteId);
    if (index !== -1) {
      const deletedNote = this.notes.splice(index, 1)[0];
      this.undoStack.push({action: 'deleteNote', data: {note: deletedNote}});
      this.redoStack = []; // Clear redo stack when new action is performed
      this.printOperationResult(`Note "${deletedNote.title}" deleted.`);
    }
  }

  undo() {
    const lastAction = this.undoStack.pop();
    if (!lastAction) return;

    switch (lastAction.action) {
      case 'addNote':
        this.notes.pop();
        break;
      case 'deleteNote':
        if (lastAction.data && lastAction.data.note) {
          this.notes.push(lastAction.data.note);
        }
        break;
      // Add other cases if needed
    }

    this.redoStack.push(lastAction);
    this.printOperationResult(`Undo: ${lastAction.action}`);
  }

  redo() {
    const lastUndoAction = this.redoStack.pop();
    if (!lastUndoAction) return;

    switch (lastUndoAction.action) {
      case 'addNote':
        if (lastUndoAction.data && lastUndoAction.data.note) {
          this.notes.push(lastUndoAction.data.note);
        }
        break;
      case 'deleteNote':
        if (lastUndoAction.data && lastUndoAction.data.note) {
          this.deleteNoteById(lastUndoAction.data.note.id);
        }
        break;
      // Add other cases if needed
    }

    this.undoStack.push(lastUndoAction);
    this.printOperationResult(`Redo: ${lastUndoAction.action}`);
  }

  async saveToFile(fileName: string, callback: () => void) {
    fs.readFile(fileName, 'utf-8', (readError, data) => {
      let existingNotes = [];
      if (!readError) {
        try {
          existingNotes = JSON.parse(data);
        } catch (parseError) {
          this.printError(
            `Error parsing existing notes from file "${fileName}": ${parseError}`
          );
        }
      }

      // Combine existing notes with new notes
      const combinedNotes = existingNotes.concat(this.notes);
      const jsonData = JSON.stringify(combinedNotes, null, 2); // Format JSON with 2 spaces indentation

      fs.writeFile(fileName, jsonData, 'utf-8', writeError => {
        if (writeError) {
          this.printError(
            `Error saving notes to file "${fileName}": ${writeError}`
          );
        } else {
          this.printOperationResult(`Notes saved to file "${fileName}".`);
          callback();
        }
      });
    });
  }

  async loadFromFile(fileName: string, callback: () => void) {
    fs.readFile(fileName, 'utf-8', (error, data) => {
      if (error) {
        this.printError(
          `Error loading notes from file "${fileName}": ${error}`
        );
      } else {
        try {
          const notesData = JSON.parse(data);
          for (const noteData of notesData) {
            // Check if the note already exists before adding
            if (!this.getNoteById(noteData.id)) {
              const note = new Note(
                noteData.title,
                noteData.content,
                noteData.id,
                new Date(noteData.createdAt),
                new Date(noteData.updatedAt)
              );
              this.notes.push(note); // Add note directly to the array
            }
          }
          this.printOperationResult(`Notes loaded from file "${fileName}".`);
          callback(); // Call the callback function after loading the notes
        } catch (parseError) {
          this.printError(
            `Error parsing notes from file "${fileName}": ${parseError}`
          );
        }
      }
    });
  }

  printOperationResult(message: string) {
    console.log(`Operation Result: ${message}`);
  }

  printError(message: string) {
    console.error(`Error: ${message}`);
  }
}

// Testing the Note and NotesManager classes

// const note5 = new Note('5th Note', 'Testing the savetofile method');
// const note6 = new Note('6th Note', 'same as 5th note');

const yourNotes = new NotesManager();
// yourNotes.addNote(note5);
// yourNotes.addNote(note6);

const fileName = 'test.json';
yourNotes.saveToFile(fileName, () => {
  console.log('saved notes.');
});
yourNotes.loadFromFile(fileName, () => {
  const notesList = yourNotes.listNotes();
  console.log(notesList);
});

/*
Constructor - WORKS
getInfo() - WORKS
addNote() - WORKS
getNoteById() - WORKS
deleteNoteById() - WORKS
undo() - WORKS
redo() - WORKS
saveToFile() - WORKS
loadFromFile() - WORKS
listNotes() - WORKS
*/
