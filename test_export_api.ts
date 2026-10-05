const payload = {
  format: 'PDF',
  resumeContent: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    summary: 'Test summary',
    experience: [
      {
        role: 'Optimized Role',
        company: 'Company',
        bullets: ['Test bullet']
      }
    ]
  },
  template: 'SwissModernism'
};

fetch('http://localhost:3001/api/export', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
}).then(res => res.text()).then(text => console.log('Response:', text.substring(0, 200))).catch(err => console.error(err));
