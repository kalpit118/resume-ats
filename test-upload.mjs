import fs from 'fs';

async function test() {
  const formData = new FormData();
  formData.append('resumeText', 'This is a valid resume text. I am a software engineer with 5 years of experience.');
  formData.append('jdText', 'Software Engineer role looking for 5 years of experience.');
  
  try {
    const res = await fetch('http://localhost:3001/api/analyze', {
      method: 'POST',
      body: formData
    });
    console.log('Status:', res.status);
    console.log('Body:', await res.text());
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
test();
