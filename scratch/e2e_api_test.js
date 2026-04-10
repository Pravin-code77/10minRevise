const BASE_URL = 'http://127.0.0.1:5000/api';
let token = '';

async function runTests() {
    console.log('--- STARTING E2E BACKEND TESTS (FETCH) ---');

    try {
        // 1. Auth Test
        const email = `test_${Date.now()}@example.com`;
        console.log(`1. Registering user: ${email}`);
        const regRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'tester', email, password: 'password123' })
        });
        
        const regData = await regRes.json();
        if (regRes.status !== 201) {
            console.error('Registration failed:', regData);
            return;
        }
        token = regData.token;
        console.log('✅ Auth Success');

        // 2. Simplify Feature Test
        console.log('2. Testing Simplify Feature...');
        const simpRes = await fetch(`${BASE_URL}/flashcards/sets`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'Test Set',
                cards: [{ term: 'Photosynthesis', definition: 'The process by which plants make food' }],
                type: 'simplify'
            })
        });
        
        const simpData = await simpRes.json();
        console.log('Status:', simpRes.status);
        if (simpRes.status === 201) console.log('✅ Simplify Success');

        // 3. Visualize Feature Test
        console.log('3. Testing Visualize Feature...');
        const visRes = await fetch(`${BASE_URL}/flashcards/sets`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'Test Vis',
                cards: [{ term: 'Water Cycle', definition: 'Evaporation, Condensation, Precipitation' }],
                type: 'visualize'
            })
        });
        
        console.log('Status:', visRes.status);
        if (visRes.status === 201) console.log('✅ Visualize Success');

        // 4. Compiler Lab Test
        console.log('4. Testing Compiler Lab (Python)...');
        const compRes = await fetch(`${BASE_URL}/compiler/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: 'python', code: 'print("E2E Test Success")' })
        });
        
        const compData = await compRes.json();
        console.log('Output:', compData.stdout);
        if (compData.stdout?.includes('Success')) console.log('✅ Compiler Success');

    } catch (err) {
        console.error('❌ E2E Script Error:', err);
    }

    console.log('--- E2E BACKEND TESTS COMPLETE ---');
}

runTests();
