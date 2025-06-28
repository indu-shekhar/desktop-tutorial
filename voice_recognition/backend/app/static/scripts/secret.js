document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('access_token');

    if (!token) {
        alert('No access token found. Please log in.');
        window.location.href = '/';
        return;
    }

    try {
        const response = await fetch('/secret', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('message').textContent = data.message;
        } else {
            alert('Access denied. Please log in again.');
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Error:', error);
    }
});