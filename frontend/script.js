const API_URL = '/api/birthdays';
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/login.html';
}

const user = JSON.parse(localStorage.getItem('user') || '{}');
document.getElementById('userName').innerText = user.name || 'User';

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', fetchBirthdays);

document.getElementById('birthdayForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const birthday = {
        name: document.getElementById('name').value,
        birthdate: document.getElementById('birthdate').value
    };
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify(birthday)
        });
        if (res.ok) {
            alert('✅ Birthday added!');
            document.getElementById('birthdayForm').reset();
            fetchBirthdays();
        } else {
            alert('❌ Failed to add');
        }
    } catch(e) {
        alert('❌ Failed to add');
    }
});

async function fetchBirthdays() {
    try {
        const res = await fetch(API_URL, { headers: { 'Authorization': token } });
        const birthdays = await res.json();
        displayBirthdays(birthdays);
        displayReminders(birthdays);
    } catch(e) {
        console.error(e);
    }
}

function displayBirthdays(birthdays) {
    const container = document.getElementById('birthdayContainer');
    container.innerHTML = '';
    if (birthdays.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">No birthdays added yet</p>';
        return;
    }
    birthdays.forEach(b => {
        const div = document.createElement('div');
        div.className = 'birthday-item';
        div.innerHTML = '<div><strong>' + escapeHtml(b.name) + '</strong><br>📅 ' + b.birthdate + '</div><div class="birthday-actions"><button class="edit-btn" onclick="editBirthday(\'' + b._id + '\')">Edit</button><button class="delete-btn" onclick="deleteBirthday(\'' + b._id + '\')">Delete</button></div>';
        container.appendChild(div);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function getDaysUntil(birthdate) {
    const today = new Date();
    const birth = new Date(birthdate);
    let next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    if (next < today) next = new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate());
    return Math.ceil((next - today) / (1000 * 60 * 60 * 24));
}

function displayReminders(birthdays) {
    const container = document.getElementById('reminderList');
    const upcoming = birthdays.filter(b => getDaysUntil(b.birthdate) <= 30);
    upcoming.sort((a, b) => getDaysUntil(a.birthdate) - getDaysUntil(b.birthdate));
    if (upcoming.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">No upcoming birthdays in next 30 days</p>';
        return;
    }
    let html = '';
    for (let b of upcoming) {
        const days = getDaysUntil(b.birthdate);
        let text = days === 0 ? '🎉 TODAY! 🎉' : days === 1 ? 'Tomorrow!' : 'in ' + days + ' days';
        html += '<div class="reminder-card' + (days === 0 ? ' today' : '') + '">🎂 ' + escapeHtml(b.name) + ' - ' + text + '</div>';
    }
    container.innerHTML = html;
}

window.editBirthday = async (id) => {
    try {
        const res = await fetch(API_URL + '/' + id, { headers: { 'Authorization': token } });
        const b = await res.json();
        document.getElementById('editId').value = b._id;
        document.getElementById('editName').value = b.name;
        document.getElementById('editBirthdate').value = b.birthdate;
        document.getElementById('editModal').style.display = 'block';
    } catch(e) {
        alert('❌ Failed to load');
    }
};

document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const updated = {
        name: document.getElementById('editName').value,
        birthdate: document.getElementById('editBirthdate').value
    };
    try {
        const res = await fetch(API_URL + '/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify(updated)
        });
        if (res.ok) {
            alert('✅ Updated!');
            closeModal();
            fetchBirthdays();
        } else {
            alert('❌ Update failed');
        }
    } catch(e) {
        alert('❌ Update failed');
    }
});

window.deleteBirthday = async (id) => {
    if (confirm('Delete this birthday?')) {
        try {
            const res = await fetch(API_URL + '/' + id, {
                method: 'DELETE',
                headers: { 'Authorization': token }
            });
            if (res.ok) {
                alert('✅ Deleted!');
                fetchBirthdays();
            } else {
                alert('❌ Delete failed');
            }
        } catch(e) {
            alert('❌ Delete failed');
        }
    }
};

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

window.onclick = function(event) {
    if (event.target === document.getElementById('editModal')) closeModal();
};