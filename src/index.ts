import * as fs from 'fs';

class Note {
  id: string; // to uniquely identify the notes
  title: string; // title of the note
  content: string; // whatever the user decides to write in the note
  createdAt: Date; // note creation date
  updatedAt: Date; // date the note was updated

  constructor(title: string, content: string) {
    this.id = this.generateUniqueId(); // the user doesn't have to come up with an id
    this.title = title;
    this.content = content;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // method to update the note
  update(title: string, content: string) {
    this.title = title;
    this.content = content;
    this.updatedAt = new Date();
  }

  // method to get the note details
  getInfo(): string {
    return `
          ID: ${this.id}
          Title: ${this.title}
          Content: ${this.content}
          Created At: ${this.createdAt}
          Updated At: ${this.updatedAt}
      `;
  }
  // Generate a unique ID
  private generateUniqueId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
} // The Notes class ends here

class NotesManager {
  notes: Note[];

  private undoStack: {action: string; data?: any; subActions?: any[]}[];
  private redoStack: {action: string; data?: any; subActions?: any[]}[];

  constructor() {
    this.notes = [];

    this.undoStack = [];
    this.redoStack = [];
  }

  addNote(note: Note) {
    this.notes.push(note);
    this.undoStack.push({action: 'addNote', data: {note}});
    this.redoStack = []; // Clear redo stack when new action is performed
    this.printOperationResult(`Note "${note.title}" added.`);
  }

  deleteNote(id: string) {
    console.log('Notes before deletion:', this.notes);
    const index = this.notes.findIndex(note => note.id === id);
    console.log('Index:', index);
    if (index !== -1) {
      const deletedNote = this.notes.splice(index, 1)[0];
      this.undoStack.push({
        action: 'deleteNote',
        data: {id, note: deletedNote},
      });
      this.redoStack = []; // Clear redo stack when new action is performed
      this.printOperationResult(`Note "${deletedNote.title}" deleted.`);
    } else {
      this.printError(`Note with ID "${id}" not found.`);
    }
    console.log('Notes after deletion:', this.notes);
  }

  getNote(id: string): Note | undefined {
    return this.notes.find(note => note.id === id);
  }

  listNotes(): string {
    let result = '';
    this.notes.forEach(note => {
      result += note.getInfo() + '\n\n';
    });
    return result;
  }

  private deleteNoteWithSubActions(id: string, subActions?: any[]) {
    // Execute delete note action
    this.deleteNote(id);

    // Execute sub-actions recursively
    if (subActions) {
      for (const subAction of subActions) {
        this.executeRedoAction(subAction);
      }
    }
  }

  private executeRedoAction(action: any) {
    switch (action.action) {
      case 'addNote':
        this.addNoteWithSubActions(action.data.note, action.subActions);
        break;
      case 'deleteNote':
        this.deleteNoteWithSubActions(action.data.id, action.subActions);
        break;
      // Add cases for other actions if needed
    }
  }

  private addNoteWithSubActions(note: Note, subActions?: any[]) {
    // Execute add note action
    this.addNote(note);

    // Execute sub-actions recursively
    if (subActions) {
      for (const subAction of subActions) {
        this.executeUndoAction(subAction);
      }
    }
  }

  private executeUndoAction(action: any) {
    switch (action.action) {
      case 'addNote':
        this.deleteNoteWithSubActions(action.data.id, action.subActions);
        break;
      case 'deleteNote':
        this.addNoteWithSubActions(action.data.note, action.subActions);
        break;
      // Add cases for other actions if needed
    }
  }

  undo() {
    if (this.undoStack.length === 0) {
      console.log('Nothing to undo.');
      return;
    }

    const lastAction = this.undoStack.pop();
    if (lastAction) {
      console.log('Undo action:', lastAction);
      if (lastAction.action === 'deleteNote') {
        this.addNoteWithoutStacking(lastAction.data.note); // Restore the deleted note
      }

      if (lastAction.action === 'addNote') {
        this.deleteNoteWithoutStacking(lastAction.data.note.id);
      } else {
        this.executeActionRecursively(lastAction, 'undo');
      }
      this.redoStack.push(lastAction); // Move action to redo stack
    }
  }

  private executeActionRecursively(action: any, direction: 'undo' | 'redo') {
    const actions =
      direction === 'undo' ? action.subActions?.reverse() : action.subActions;
    if (actions) {
      for (const subAction of actions) {
        this.executeActionRecursively(subAction, direction);
      }
    }

    // Execute the main action
    if (direction === 'undo') {
      // If undoing, switch direction for deleteNote action
      this.executeSingleAction({...action, action: 'deleteNote'});
    } else {
      this.executeSingleAction(action);
    }
  }

  addNoteWithoutStacking(note: Note) {
    console.log('Adding note:', note); // Log the note being added
    this.notes.push(note);
    this.printOperationResult(`Note "${note.title}" added.`);
    console.log('Notes after adding:', this.notes); // Log the state of the notes array
  }

  deleteNoteWithoutStacking(id: string) {
    // Find and delete the note without recursion, just remove from the array
    const index = this.notes.findIndex(note => note.id === id);
    if (index !== -1) {
      const deletedNote = this.notes.splice(index, 1)[0];
      this.printOperationResult(`Note "${deletedNote.title}" deleted.`);
    } else {
      this.printError(`Note with ID "${id}" not found.`);
    }
  }

  redo() {
    if (this.redoStack.length === 0) {
      console.log('Nothing to redo.');
      return;
    }

    const lastAction = this.redoStack.pop();
    if (lastAction) {
      this.executeActionRecursively(lastAction, 'undo');
      this.undoStack.push(lastAction); // Move action to undo stack
    }
  }

  private executeSingleAction(action: any) {
    switch (action.action) {
      case 'addNote':
        this.addNoteWithoutStacking(action.data.note);
        break;
      case 'deleteNote':
        this.deleteNoteWithoutStacking(action.data.id);
        break;
      // Add cases for other actions if needed
    }
  }

  async saveToFile(fileName: string) {
    const data = JSON.stringify(this.notes, null, 2); // Use null and 2 for indentation
    fs.writeFile(fileName, data, error => {
      if (error) {
        this.printError(`Error saving notes to file "${fileName}": ${error}`);
      } else {
        this.printOperationResult(`Notes saved to file "${fileName}".`);
      }
    });
  }

  async loadFromFile(fileName: string) {
    fs.readFile(fileName, 'utf-8', (error, data) => {
      if (error) {
        this.printError(
          `Error loading notes from file "${fileName}": ${error}`
        );
      } else {
        this.notes = JSON.parse(data).map(
          (note: Note) => new Note(note.title, note.content)
        );
        this.printOperationResult(`Notes loaded from file "${fileName}".`);
      }
    });
  }

  printOperationResult(message: string) {
    console.log(`Operation Result: ${message}`);
  }

  printError(message: string) {
    console.error(`Error: ${message}`);
  }
} // The NotesManager class ends here

// Testing the Note class *****
const newNote = new Note('First note', 'Just testing this');
const secondNote = new Note('Second note', 'More irrelevant content');
// console.log(newNote.getInfo());

/*
Constructor - WORKS
getInfo() - WORKS
*/

// Finished testing the Note class ****

// Testing the NotesManager class ****
const yourNotes = new NotesManager();
yourNotes.addNote(newNote);
yourNotes.addNote(secondNote);
yourNotes.saveToFile('test file');

/**
 * Constructor - WORKS
 * addNote() - WORKS
 * getNote() - WORKS
 * listNotes() - WORKS
 * deleteNote() - WORKS
 * undo() - WORKS
 */

// Finished testing the NotesManager class ****
