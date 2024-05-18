export {}; 

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
    this.id = id || this.generateUniqueId(); // if the id isn't provided, one will be created here
    this.title = title;
    this.content = content;
    this.createdAt = createdAt || new Date(); // if no date is provided, one will be created here
    this.updatedAt = updatedAt || new Date(); // if no date is provided, one will be created here
  }

  update(title: string, content: string) { // updates the note
    this.title = title;
    this.content = content;
    this.updatedAt = new Date();
  }

  getInfo(): string { // gets info on the note
    return `
      ID: ${this.id}
      Title: ${this.title}
      Content: ${this.content}
      Created At: ${this.createdAt}
      Updated At: ${this.updatedAt}
    `;
  }

  private generateUniqueId(): string { // Method to generate a unique ID for a note
    return Math.random().toString(36).substr(2, 9);
  }
}

class NotesManager { // Defining a class for managing notes
  notes: Note[];
  private undoStack: { action: string; data?: any; subActions?: any[] }[];
  private redoStack: { action: string; data?: any; subActions?: any[] }[];

  constructor() {
    this.notes = [];
    this.undoStack = [];
    this.redoStack = [];
  }

  // Method to add a note without stacking it for undo/redo
  addNoteWithoutStacking(note: Note) {
    this.notes.push(note);
    this.printOperationResult(`Note "${note.title}" added.`);
  }

  addNote(note: Note) { // add the note to the class and also the action to the stack
    this.notes.push(note);
    this.undoStack.push({ action: 'addNote', data: { note } });
    this.redoStack = []; // Clear redo stack when new action is performed
    this.printOperationResult(`Note "${note.title}" added.`);
  }

  listNotes(): string { // Method to list all notes
    let result = '';
    this.notes.forEach(note => {
      result += note.getInfo() + '\n\n';
    });
    return result;
  }

  getNoteById(noteId: string): Note | undefined { // get the note by the id
    return this.notes.find(note => note.id === noteId);
  }

  deleteNoteById(noteId: string) { // to delete the note using the id
    const index = this.notes.findIndex(note => note.id === noteId);
    if (index !== -1) {
      const deletedNote = this.notes.splice(index, 1)[0];
      this.undoStack.push({ action: 'deleteNote', data: { note: deletedNote } });
      this.redoStack = []; // Clear redo stack when new action is performed
      this.printOperationResult(`Note "${deletedNote.title}" deleted.`);
    }
  }

  undo() { // Method to undo the last action
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
    }

    this.redoStack.push(lastAction);
    this.printOperationResult(`Undo: ${lastAction.action}`);
  }

  // Method to redo the last undone action
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
    }

    this.undoStack.push(lastUndoAction);
    this.printOperationResult(`Redo: ${lastUndoAction.action}`);
  }

  // method to save the notes to a file
  saveToFile(fileName: string, callback: () => void) {
    if (typeof window === 'undefined') {
      const fs = require('fs');
      fs.readFile(fileName, 'utf-8', (readError: any, data: string) => {
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

        fs.writeFile(fileName, jsonData, 'utf-8', (writeError: any) => {
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
    } else {
      // Browser environment
      const notesJson = JSON.stringify(this.notes, null, 2);
      localStorage.setItem(fileName, notesJson);
      this.printOperationResult(`Notes saved to localStorage as "${fileName}".`);
      callback();
    }
  }

  // Method to load notes from a file
  loadFromFile(fileName: string, callback: () => void) {
    if (typeof window === 'undefined') {
      // Node.js environment
      const fs = require('fs');
      fs.readFile(fileName, 'utf-8', (error: any, data: string) => {
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
    } else {
      // Browser environment
      const notesJson = localStorage.getItem(fileName);
      if (notesJson) {
        try {
          const notesData = JSON.parse(notesJson);
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
          this.printOperationResult(`Notes loaded from localStorage as "${fileName}".`);
          callback(); // Call the callback function after loading the notes
        } catch (parseError) {
          this.printError(
            `Error parsing notes from localStorage as "${fileName}": ${parseError}`
          );
        }
      } else {
        this.printError(`No notes found in localStorage with key "${fileName}".`);
      }
    }
  }

  printOperationResult(message: string) { // help the user know the result
    console.log(`Operation Result: ${message}`);
  }

  printError(message: string) { // to inform the user of errors
    console.error(`Error: ${message}`);
  }
}

// Testing the Note and NotesManager classes

const note5 = new Note('Things to Study', 'How to structure projects. \
Depending on what kind of projet you have, which framework you use and more, \
you will have to structure the project differently. ');
const note6 = new Note('2nd Note', 'Just another note created soley with the intent\
of testing the code to see how it handles certain things. ');
const yourNotes = new NotesManager();
yourNotes.addNote(note5);
yourNotes.addNote(note6);

const fileName = 'notesData';

if (typeof window === 'undefined') {
  // Node.js environment
  yourNotes.saveToFile(fileName, () => {
    console.log('Notes saved.');
    yourNotes.loadFromFile(fileName, () => {
      const notesList = yourNotes.listNotes();
      console.log(notesList);
    });
  });
} else {
  // Browser environment
  yourNotes.saveToFile(fileName, () => {
    console.log('Notes saved to localStorage.');
    yourNotes.loadFromFile(fileName, () => {
      const notesList = yourNotes.listNotes();
      console.log(notesList);
    });
  });
}

const notesContainer = document.getElementById('notes-container');



let notesArray: Note[];
notesArray = yourNotes.notes;

console.log('notes array: ', notesArray);

notesArray.forEach(note => {
  let title = document.createElement('h2');
  const content = document.createElement('p');
  content.classList.add('noteP');
  const noteDiv = document.createElement('div');
  title.textContent = note.title;
  content.textContent = note.content;
  noteDiv.appendChild(title);
  noteDiv.appendChild(content);
  noteDiv.classList.add('note-div');
  const noteId = note.id; // Get the note ID
  noteDiv.id = noteId; // Set the ID of the note container

    // Function to handle mouseover event
    const handleMouseOver = () => {
      const deleteOptions = createDeleteOptions(noteId);
      noteDiv.appendChild(deleteOptions);
    };
  
    // Function to handle mouseout event
    const handleMouseOut = () => {
      const deleteOptions = noteDiv.querySelector('.delete-options');
      if (deleteOptions) {
        deleteOptions.remove();
      }
    };
  
    noteDiv.addEventListener('mouseover', handleMouseOver);
    noteDiv.addEventListener('mouseout', handleMouseOut);
    
  noteDiv.contentEditable = 'true';

   // Add event listener for blur event
   noteDiv.addEventListener('blur', function(event) {
    const editedDiv = event.target as HTMLDivElement; // Cast the event target to HTMLDivElement
    const editedContent = editedDiv.textContent; // Get the edited content
    yourNotes.saveToFile(fileName, () => {
      console.log('Notes saved.');
      yourNotes.loadFromFile(fileName, () => {
        const notesList = yourNotes.listNotes();
        console.log(notesList);
      });
    });
    // Here you can handle the edited content as needed
    console.log('Edited content:', editedContent);
  });
  
  notesContainer?.appendChild(noteDiv);
});

console.log('notesArray: ', notesArray);
console.log('number of notes: ', yourNotes.notes.length);


// Wait for the DOM content to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
  // Get a reference to the form element
  const noteForm = document.getElementById('note-form');

  // Add event listener for form submission
  noteForm?.addEventListener('submit', function (event) {
    // Prevent the default form submission behavior
    event.preventDefault();

    // Retrieve the values entered by the user in the input fields
    const title = document.getElementById('title') as HTMLInputElement | null;
    const content = document.getElementById('content') as HTMLInputElement | null;


    // Perform any necessary actions, such as creating a new note
    createNote(title, content);

    // Optionally, clear the input fields after creating the note
    title?.setAttribute('value', '');
    content?.setAttribute('value', '');
  });

  // Function to create a new note
  function createNote(title: any, content: any) {
    console.log('title: ', title);
    console.log('content: ', content);
    const newNote = new Note(title.value, content.value);
    yourNotes.addNote(newNote);

    let titleElement = document.createElement('h2');
    const contentElement = document.createElement('p');
    contentElement.classList.add('noteP');
    const noteDiv = document.createElement('div');
    titleElement.textContent = newNote.title;
    contentElement.textContent = newNote.content;
    noteDiv.appendChild(titleElement);
    noteDiv.appendChild(contentElement);
    noteDiv.classList.add('note-div');

    noteDiv.contentEditable = 'true';

   // Add event listener for blur event
   noteDiv.addEventListener('blur', function(event) {
    const editedDiv = event.target as HTMLDivElement; // Cast the event target to HTMLDivElement
    const editedContent = editedDiv.textContent; // Get the edited content
    yourNotes.saveToFile(fileName, () => {
      console.log('Notes saved.');
      yourNotes.loadFromFile(fileName, () => {
        const notesList = yourNotes.listNotes();
        console.log(notesList);
      });
    });
    // Here you can handle the edited content as needed
    console.log('Edited content:', editedContent);
  });
      
    notesContainer?.appendChild(noteDiv);
    // Here you can implement the logic to create a new note
    // For example, you can instantiate a Note object and add it to the notes list
    // Then, you can update the UI to display the newly created note
  }
});

// Function to create delete option bubbles
function createDeleteOptions(noteId: any) {
  const deleteOptions = document.createElement('div');
  deleteOptions.classList.add('delete-options');

  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Delete';
  deleteButton.classList.add('delete-button');
  deleteButton.addEventListener('click', () => {
    // Call deleteNoteById method of NotesManager to delete the note
    yourNotes.deleteNoteById(noteId);
    // Remove the note container from the DOM
    const noteContainer = document.getElementById(noteId);
    if (noteContainer) {
      noteContainer.remove();
    }
  });

  deleteOptions.appendChild(deleteButton);

  return deleteOptions;
}

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

