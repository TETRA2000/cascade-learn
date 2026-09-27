// Rust questions for pure unit tests (validation, grading, feedback, the checker).
// The real starter content lives in content/rust/questions.json.
import type {
  RustBuildQuestion,
  RustCompilesQuestion,
  RustErrorQuestion,
  RustFixQuestion,
  RustPairsQuestion,
  RustPredictQuestion,
  RustTypeQuestion,
} from '../content';

export const rsPredict: RustPredictQuestion = {
  id: 'rs-predict-1',
  type: 'rs-predict',
  prompt: 'What does this program print?',
  code: ['# fn main() {', 'let a = 5;', 'let mut b = a;', 'b += 1;', 'println!("{a} {b}");', '# }'],
  opts: [
    { text: '5 6', kind: 'output' },
    { text: '6 6', kind: 'output' },
    { text: "Doesn't compile", kind: 'error' },
  ],
  answer: 0,
  explain: '`i32` is `Copy`.',
};

export const rsPredictError: RustPredictQuestion = {
  ...rsPredict,
  id: 'rs-predict-2',
  answer: 2,
  error: 'error[E0382]: borrow of moved value: `s`',
};

export const rsPairs: RustPairsQuestion = {
  id: 'rs-pairs-1',
  type: 'rs-pairs',
  prompt: 'Match each type to what it means',
  items: [
    { id: 'own', left: 'String', right: 'Owned text' },
    { id: 'shr', left: '&String', right: 'Shared borrow' },
    { id: 'mut', left: '&mut String', right: 'Exclusive borrow' },
    { id: 'cln', left: 's.clone()', right: 'Deep copy' },
  ],
  order: ['mut', 'cln', 'own', 'shr'],
  explain: 'Owning vs borrowing.',
};

export const rsCompiles: RustCompilesQuestion = {
  id: 'rs-compiles-1',
  type: 'rs-compiles',
  prompt: 'Which one compiles?',
  a: ['let t = s;'],
  b: ['let t = &s;'],
  answer: 'b',
  error: 'error[E0382]: borrow of moved value: `s`',
  explain: 'A moves `s`.',
};

export const rsBuild: RustBuildQuestion = {
  id: 'rs-build-1',
  type: 'rs-build',
  prompt: 'Fill the blanks',
  code: [['fn shout(s: ', { slot: 0 }, ') -> String {'], '    s.to_uppercase()', '}', ['let loud = shout(', { slot: 1 }, ');']],
  bank: ['String', '&String', 'name', '&name'],
  answer: ['&String', '&name'],
  output: ['ferris FERRIS'],
  explain: 'Borrow it.',
};

export const rsError: RustErrorQuestion = {
  id: 'rs-error-1',
  type: 'rs-error',
  prompt: 'rustc rejects one line. Which one?',
  code: ['fn main() {', '    let v = vec![1];', '    let w = v;', '    println!("{}", v.len());', '}'],
  answer: 4,
  error: 'error[E0382]: borrow of moved value: `v`',
  explain: '`v` moved on line 3.',
};

export const rsFix: RustFixQuestion = {
  id: 'rs-fix-1',
  type: 'rs-fix',
  prompt: 'Pick the change that makes this compile',
  code: ['fn main() {', '    let s = String::from("hi");', '    let t = s;', '    println!("{s} {t}");', '}'],
  error: 'error[E0382]: borrow of moved value: `s`',
  opts: [
    { diff: ['-     let t = s;', '+     let t = s.clone();'] },
    { diff: ['-     println!("{s} {t}");', '+     println!("{t} {s}");'] },
    { diff: ['-     let s = String::from("hi");', '+     let mut s = String::from("hi");'] },
  ],
  answer: 0,
  explain: 'Clone it.',
};

export const rsType: RustTypeQuestion = {
  id: 'rs-type-1',
  type: 'rs-type',
  prompt: 'Type the missing token',
  code: ['fn add_one(v: ___ Vec<i32>) {', '    v.push(1);', '}'],
  accept: ['&mut', '& mut'],
  explain: 'Needs `&mut`.',
};
