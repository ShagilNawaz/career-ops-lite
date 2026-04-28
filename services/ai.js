import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.MODEL || 'llama3';

// ── Core Ollama call ──────────────────────────────────────────────────────────

export async function callAI(prompt, expectJSON = true) {
  const systemNote = expectJSON
    ? 'You must return ONLY valid JSON. No markdown, no explanation, no code fences.'
    : '';

  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt: systemNote ? `${systemNote}\n\n${prompt}` : prompt,
      stream: false
    })
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.response;
}

function parseJSON(raw) {
  // Strip any accidental markdown code fences
  const clean = raw.replace(/```json|```/gi, '').trim();
  return JSON.parse(clean);
}

// ── Resume Generation ─────────────────────────────────────────────────────────

export async function generateResumeData(profile, jobDescription) {
  const prompt = `
You are a professional ATS-friendly resume writer.

Generate a tailored resume for the candidate below, optimized for the given job description.
Use keywords from the job description naturally throughout.

Return ONLY this exact JSON structure:
{
  "name": "",
  "contact": "",
  "summary": "",
  "skills": ["", ""],
  "experience": [
    {
      "role": "",
      "company": "",
      "duration": "",
      "points": ["", ""]
    }
  ],
  "projects": [
    {
      "name": "",
      "description": "",
      "tech": ""
    }
  ],
  "education": "",
  "certifications": []
}

Candidate Profile:
${JSON.stringify(profile, null, 2)}

Job Description:
${jobDescription}
`;

  const raw = await callAI(prompt, true);
  return parseJSON(raw);
}

// ── Job Fit Scoring ───────────────────────────────────────────────────────────

export async function scoreJob(profile, job) {
  const prompt = `
You are a career advisor. Score how well this candidate fits this job.

Return ONLY this exact JSON:
{
  "score": 7,
  "reasoning": "Short explanation of the score",
  "matchingSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"],
  "recommendation": "One sentence advice for this application",
  "experienceMatch": "entry|junior|mid|senior",
  "atsKeywords": ["keyword1", "keyword2"]
}

Score scale: 0 = no match, 10 = perfect match.
Be realistic. Only give 9-10 if it is an exceptional match.

Candidate Profile:
Name: ${profile.name}
Skills: ${(profile.skills || []).join(', ')}
Experience: ${JSON.stringify(profile.experience || [])}
Education: ${profile.education || ''}

Job:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
`;

  const raw = await callAI(prompt, true);
  return parseJSON(raw);
}

// ── Cover Letter Generation ───────────────────────────────────────────────────

export async function generateCoverLetter(profile, job) {
  const prompt = `
You are a professional cover letter writer.

Write a personalized, compelling cover letter for this job application.
- 3-4 paragraphs
- Mention the company name and role specifically
- Reference 2-3 of the candidate's most relevant skills or achievements
- Close with a confident call to action
- Do NOT use generic filler phrases like "I am writing to apply"
- Return ONLY the cover letter text, no subject line, no JSON

Candidate:
Name: ${profile.name}
Skills: ${(profile.skills || []).join(', ')}
Summary: ${profile.summary || ''}
Experience: ${(profile.experience || []).map(e => `${e.role} at ${e.company}`).join(', ')}

Job:
Role: ${job.title}
Company: ${job.company}
Description: ${job.description}
`;

  return await callAI(prompt, false);
}

// ── Skill Gap Analysis ────────────────────────────────────────────────────────

export async function analyzeSkillGap(profile, jobs) {
  const jobSummaries = jobs.slice(0, 10).map(j => ({
    title: j.title,
    missingSkills: j.missingSkills || [],
    description: (j.description || '').substring(0, 500)
  }));

  const prompt = `
You are a career development advisor.
Analyze the skill gaps between this candidate and the jobs they are targeting.

Return ONLY this exact JSON:
{
  "missingSkills": ["skill1", "skill2"],
  "strongPoints": ["point1", "point2"],
  "overallReadiness": 65,
  "recommendations": [
    {
      "skill": "Kubernetes",
      "priority": "high",
      "reason": "Required in 70% of target jobs",
      "learnFrom": "Official docs + hands-on lab"
    }
  ],
  "summary": "One paragraph summary of the candidate's readiness"
}

overallReadiness is an integer 0-100 representing % job readiness.

Candidate Skills: ${(profile.skills || []).join(', ')}
Candidate Experience: ${(profile.experience || []).map(e => e.role).join(', ')}

Target Jobs (sample):
${JSON.stringify(jobSummaries, null, 2)}
`;

  const raw = await callAI(prompt, true);
  return parseJSON(raw);
}

// ── Suggested Answer Generator ────────────────────────────────────────────────

export async function generateApplicationAnswers(profile, job) {
  const prompt = `
You are a job application coach.
Generate concise, authentic answers to common application questions for this specific role.

Return ONLY this exact JSON:
{
  "whyThisRole": "",
  "whyThisCompany": "",
  "greatestStrength": "",
  "relevantExperience": "",
  "salaryExpectation": "Research-based range suggestion",
  "availableFrom": "Immediately or notice period advice"
}

Keep each answer under 100 words. Be specific, not generic.

Candidate:
${JSON.stringify(profile, null, 2)}

Job:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
`;

  const raw = await callAI(prompt, true);
  return parseJSON(raw);
}
