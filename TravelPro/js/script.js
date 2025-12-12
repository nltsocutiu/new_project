// ==========================================
// 1. CONFIGURATION & CONSTANTS
// ==========================================
const API_URL = 'https://67c9ea3a102d684575c3f11e.mockapi.io';
const ENDPOINT_TOURS = `${API_URL}/touris`; 
const ENDPOINT_USERS = `${API_URL}/users`;
const ADMIN_EMAIL = "admin@gmail.com";

const dictionary = {
    vi: {
        search: "Tìm Tour", duration: "Thời lượng (ngày)", location: "Địa điểm", priceMax: "Giá tối đa",
        addTour: "Thêm Tour Mới", loading: "Đang tải dữ liệu...", savedTours: "Tour quan tâm", 
        yourCart: "Giỏ hàng", total: "Tổng cộng:", checkout: "Thanh toán ngay",
        tourName: "Tên Tour", image: "Hình ảnh (URL)", price: "Giá ($)", close: "Đóng", save: "Lưu",
        noteTitle: "Ghi chú", saveNote: "Lưu ghi chú", notePlaceholder: "Ghi chú cho tour này...",
        msgSaved: "Đã lưu thành công!", msgDeleted: "Đã xóa!", msgAddedFav: "Đã thêm vào yêu thích", msgAddedCart: "Đã thêm vào giỏ hàng",
        msgWelcome: "Xin chào", msgLoginFail: "Sai email hoặc mật khẩu!", msgRegSuccess: "Đăng ký thành công!",
        emptyCart: "Giỏ hàng trống", cartCleared: "Thanh toán thành công!"
    },
    en: {
        search: "Search Tour", duration: "Duration (days)", location: "Destination", priceMax: "Max Price",
        addTour: "Add New Tour", loading: "Loading data...", savedTours: "Saved Tours",
        yourCart: "Your Cart", total: "Total:", checkout: "Checkout Now",
        tourName: "Tour Title", image: "Image URL", price: "Price ($)", close: "Close", save: "Save",
        noteTitle: "Note", saveNote: "Save Note", notePlaceholder: "Note for this tour...",
        msgSaved: "Saved successfully!", msgDeleted: "Deleted!", msgAddedFav: "Added to favorites", msgAddedCart: "Added to cart",
        msgWelcome: "Welcome", msgLoginFail: "Wrong email or password!", msgRegSuccess: "Registration successful!",
        emptyCart: "Cart is empty", cartCleared: "Payment successful!"
    }
};

// ==========================================
// 2. STATE MANAGEMENT
// ==========================================
let appState = {
    tours: [],
    currentUser: JSON.parse(localStorage.getItem('currentUser')) || null,
    favorites: JSON.parse(localStorage.getItem('favTours')) || [], 
    cart: JSON.parse(localStorage.getItem('cartItems')) || [],
    lang: localStorage.getItem('appLang') || 'vi',
    theme: localStorage.getItem('appTheme') || 'light'
};

// ==========================================
// 3. INITIALIZATION
// ==========================================
$(document).ready(function() {
    initApp();
    
    // Global Event Listeners
    $('#searchInput, #durationInput, #locationFilter, #priceFilter').on('input change', debounce(filterAndRender, 300));
    $('#themeToggle').click(toggleTheme);
    $('#loginForm').submit(handleLogin);
    $('#registerForm').submit(handleRegister);
});

function initApp() {
    applyTheme(appState.theme);
    applyLanguage(appState.lang);
    
    if (appState.currentUser) {
        showMainApp();
    } else {
        showAuthScreen();
    }
}

// ==========================================
// 4. AUTHENTICATION LOGIC
// ==========================================
function showAuthScreen() {
    $('#authSection').removeClass('d-none-custom');
    $('#mainApp').addClass('d-none-custom');
}

function showMainApp() {
    $('#authSection').addClass('d-none-custom');
    $('#mainApp').removeClass('d-none-custom').addClass('fade-in');
    $('#userNameDisplay').text(appState.currentUser.name);
    
    // Check Admin Rights
    if (appState.currentUser.email === ADMIN_EMAIL) {
        $('#btnAddTour').removeClass('d-none');
        $('#adminBadge').removeClass('d-none');
        $('#btnUserManage').removeClass('d-none');
    } else {
        $('#btnAddTour').addClass('d-none');
        $('#adminBadge').addClass('d-none');
        $('#btnUserManage').addClass('d-none');
    }

    fetchTours();
    renderFavorites();
    renderCart();
}

function handleLogin(e) {
    e.preventDefault();
    const email = $('#loginEmail').val().trim();
    const pass = $('#loginPass').val().trim();
    $('#loading').show();
    
    $.get(ENDPOINT_USERS).done(users => {
        const user = users.find(u => u.email === email && u.password === pass);
        if (user) {
            appState.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            showToast(`${dictionary[appState.lang].msgWelcome}, ${user.name}!`);
            showMainApp();
        } else {
            showToast(dictionary[appState.lang].msgLoginFail, 'danger');
        }
    }).fail(() => {
        // Fallback demo
            if (email === ADMIN_EMAIL && pass === "123") {
            appState.currentUser = { name: "Admin Manager", email: email };
            localStorage.setItem('currentUser', JSON.stringify(appState.currentUser));
            showMainApp();
        } else {
            showToast("Lỗi kết nối server hoặc sai mật khẩu", 'danger');
        }
    })
    .always(() => $('#loading').hide());
}

function handleRegister(e) {
    e.preventDefault();
    const email = $('#regEmail').val().trim();
    const name = $('#regName').val().trim();
    const password = $('#regPass').val().trim();

    if(!email || !name || !password) {
        showToast("Vui lòng điền đầy đủ thông tin!", "warning");
        return;
    }

    $.get(ENDPOINT_USERS).done(users => {
        const isDuplicate = users.some(u => u.email === email);
        if (isDuplicate) {
            showToast("Email này đã được sử dụng! Vui lòng dùng email khác.", "danger");
        } else {
            const newUser = { name: name, email: email, password: password, createdAt: new Date().toISOString() };
            $.post(ENDPOINT_USERS, newUser).done(() => {
                showToast(dictionary[appState.lang].msgRegSuccess);
                $('#registerForm')[0].reset();
                $('#authTabs button[data-bs-target="#loginTab"]').click();
            }).fail(() => showToast("Lỗi đăng ký!", 'danger'));
        }
    }).fail(() => showToast("Lỗi kết nối server khi kiểm tra email!", 'danger'));
}

function logout() {
    localStorage.removeItem('currentUser');
    appState.currentUser = null;
    appState.cart = [];
    appState.favorites = [];
    location.reload();
}

// ==========================================
// 5. DATA & API HANDLING
// ==========================================
function fetchTours() {
    $('#loading').show();
    $('#tourList').hide();
    
    $.get(ENDPOINT_TOURS)
        .done(function(data) {
            appState.tours = data; 
            if (appState.currentUser) {
                const favKey = getUserKey('favTours');
                const savedFavs = localStorage.getItem(favKey);
                appState.favorites = savedFavs ? JSON.parse(savedFavs) : [];

                const cartKey = getUserKey('cartItems');
                const savedCart = localStorage.getItem(cartKey);
                appState.cart = savedCart ? JSON.parse(savedCart) : [];
            } else {
                appState.favorites = [];
                appState.cart = [];
            }
            
            filterAndRender();
            renderCart();
            renderFavorites();
            $('#loading').hide();
            $('#tourList').show();
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            console.error("Lỗi tải API:", textStatus, errorThrown);
            $('#loading').html('<div class="text-danger mt-3">❌ Lỗi kết nối API!</div>');
        });
}

function deleteTour(id) {
    if(confirm('Xóa tour này?')) {
        $.ajax({ url: `${ENDPOINT_TOURS}/${id}`, type: 'DELETE', success: () => { fetchTours(); showToast(dictionary[appState.lang].msgDeleted, "danger"); }});
    }
}

function saveTour() {
    const id = $('#tourId').val();
    const data = { 
        name: $('#inpName').val(), 
        location: $('#inpLocation').val(), 
        image: $('#inpImage').val(), 
        imageUrl: $('#inpImage').val(), 
        price: $('#inpPrice').val(), 
        rating: $('#inpRating').val() 
    };
    
    $.ajax({ 
        url: id ? `${ENDPOINT_TOURS}/${id}` : ENDPOINT_TOURS, 
        method: id ? 'PUT' : 'POST', 
        data: data, 
        success: () => { 
            bootstrap.Modal.getInstance(document.getElementById('tourModal')).hide();
            fetchTours(); 
            showToast(dictionary[appState.lang].msgSaved, "success"); 
        }
    });
}

// ==========================================
// 6. UI RENDERING & EVENTS
// ==========================================
function filterAndRender() {
    const search = $('#searchInput').val().toLowerCase();
    const maxDuration = parseFloat($('#durationInput').val());
    const location = $('#locationFilter').val().toLowerCase();
    const maxPrice = parseFloat($('#priceFilter').val());

    const filtered = appState.tours.filter(item => {
        const name = (item.name || '').toLowerCase();
        const loc = (item.location || '').toLowerCase();
        const price = parseFloat(item.price);
        const duration = parseFloat(item.rating); 
        return name.includes(search) && (!location || loc.includes(location)) && 
                (!maxPrice || price <= maxPrice) && (!maxDuration || duration <= maxDuration);
    });
    renderGrid(filtered);
}

function renderGrid(data) {
    const container = $('#tourList');
    container.empty();
    if(data.length === 0) {
        container.html('<div class="col-12 text-center text-muted"><i>Không tìm thấy Tour nào</i></div>');
        return;
    }

    const isAdmin = appState.currentUser && appState.currentUser.email === ADMIN_EMAIL;

    data.forEach(item => {
        const isFav = appState.favorites.some(f => f.id === item.id);
        const heartClass = isFav ? 'active' : '';
        const imgSrc = item.image || item.imageUrl || 'https://via.placeholder.com/300?text=No+Image';

        let adminActions = isAdmin ? `
            <div class="mt-2" onclick="event.stopPropagation()">
                <button class="btn btn-sm btn-outline-primary" onclick="openModal('${item.id}')"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteTour('${item.id}')"><i class="bi bi-trash"></i></button>
            </div>` : '';

        const html = `
            <div class="col fade-in">
                <div class="card h-100 tour-card shadow-sm" onclick="showTourDetail('${item.id}')">
                    <span class="badge bg-danger position-absolute top-0 start-0 m-2 badge-price">$${item.price}</span>
                    <div class="action-buttons">
                        <button class="btn-action btn-heart ${heartClass}" onclick="toggleFavorite(event, '${item.id}')" title="Yêu thích">
                            <i class="bi bi-heart-fill"></i>
                        </button>
                        <button class="btn-action btn-cart" onclick="addToCart(event, '${item.id}')" title="Thêm vào giỏ">
                            <i class="bi bi-cart-plus-fill"></i>
                        </button>
                    </div>
                    <img src="${imgSrc}" class="card-img-top" alt="${item.name}" onerror="this.src='https://via.placeholder.com/300'">
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title fw-bold text-truncate">${item.name}</h6>
                        <p class="card-text small text-muted mb-1"><i class="bi bi-geo-alt-fill text-success"></i> ${item.location}</p>
                        <div class="mt-auto pt-2 border-top d-flex flex-column small">
                            <span><i class="bi bi-clock"></i> ${item.rating} ngày</span>
                            ${adminActions}
                        </div>
                    </div>
                </div>
            </div>`;
        container.append(html);
    });
}

function showTourDetail(id) {
    const tour = appState.tours.find(t => t.id === id);
    if(!tour) return;

    $('#detailImg').attr('src', tour.image || tour.imageUrl || 'https://via.placeholder.com/400');
    $('#detailTitle').text(tour.name);
    $('#detailLocation').text(tour.location);
    $('#detailPrice').text('$' + tour.price);
    $('#detailDuration').text(tour.rating + ' ngày');

    $('#btnDetailAddToCart').off('click').on('click', function() {
        addToCart({ stopPropagation: () => {} }, id);
        bootstrap.Modal.getInstance(document.getElementById('detailModal')).hide();
    });

    new bootstrap.Modal(document.getElementById('detailModal')).show();
}

function openModal(id = null) {
    $('#tourId').val(id || '');
    $('#modalTitle').text(id ? 'Chỉnh sửa Tour' : 'Thêm Tour Mới');
    if(id) {
        const item = appState.tours.find(c => c.id === id);
        if(item) {
            $('#inpName').val(item.name);
            $('#inpLocation').val(item.location);
            $('#inpImage').val(item.image || item.imageUrl);
            $('#inpPrice').val(item.price);
            $('#inpRating').val(item.rating);
        }
    } else {
        $('#tourModal input').val('');
    }
    new bootstrap.Modal(document.getElementById('tourModal')).show();
}

// ==========================================
// 7. CART & FAVORITES LOGIC
// ==========================================
function addToCart(e, id) {
    e.stopPropagation();
    const existingItem = appState.cart.find(c => c.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        appState.cart.push({ id: id, quantity: 1, note: "" }); 
    }
    updateCartStorage();
    renderCart();
    showToast(dictionary[appState.lang].msgAddedCart);
    $('#cartCount').addClass('animate__animated animate__bounceIn');
    setTimeout(() => $('#cartCount').removeClass('animate__animated animate__bounceIn'), 1000);
}

function removeFromCart(id) {
    appState.cart = appState.cart.filter(c => c.id !== id);
    updateCartStorage();
    renderCart();
}

function updateCartNote(id, value) {
    const item = appState.cart.find(c => c.id === id);
    if(item) {
        item.note = value;
        updateCartStorage();
    }
}

function updateCartStorage() {
    const key = getUserKey('cartItems');
    if (key) localStorage.setItem(key, JSON.stringify(appState.cart));
}

function renderCart() {
    const container = $('#cartListContainer');
    const countBadge = $('#cartCount');
    const totalDisplay = $('#cartTotalDisplay');
    container.empty();
    countBadge.text(appState.cart.reduce((acc, item) => acc + item.quantity, 0));

    let total = 0;
    if (appState.cart.length === 0) {
        container.html(`<div class="text-center text-muted mt-5"><i class="bi bi-cart-x display-4"></i><p>${dictionary[appState.lang].emptyCart}</p></div>`);
        totalDisplay.text('$0');
        return;
    }

    appState.cart.forEach(cartItem => {
        const tour = appState.tours.find(t => t.id === cartItem.id);
        if (!tour) return;
        const itemTotal = parseFloat(tour.price) * cartItem.quantity;
        total += itemTotal;
        const imgSrc = tour.image || tour.imageUrl;

        const html = `
            <div class="card border-0 shadow-sm">
                <div class="card-body p-2">
                    <div class="d-flex gap-2 mb-2">
                        <img src="${imgSrc}" class="cart-item-img" onerror="this.src='https://via.placeholder.com/60'">
                        <div class="flex-grow-1">
                            <h6 class="mb-0 small fw-bold text-truncate" style="max-width: 150px;">${tour.name}</h6>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-danger">$${tour.price}</small>
                                <small class="fw-bold">x${cartItem.quantity}</small>
                            </div>
                        </div>
                        <button class="btn btn-sm text-danger" onclick="removeFromCart('${cartItem.id}')"><i class="bi bi-trash"></i></button>
                    </div>
                    <input type="text" class="form-control form-control-sm bg-light" 
                        placeholder="${dictionary[appState.lang].notePlaceholder}" 
                        value="${cartItem.note || ''}" 
                        onchange="updateCartNote('${cartItem.id}', this.value)">
                </div>
            </div>`;
        container.append(html);
    });
    totalDisplay.text(`$${total.toLocaleString()}`);
}

function handleCheckout() {
    if (appState.cart.length === 0) {
        showToast(dictionary[appState.lang].emptyCart, 'warning');
        return;
    }
    let total = 0;
    let htmlItems = '<ul class="list-group list-group-flush">';
    appState.cart.forEach(cartItem => {
        const tour = appState.tours.find(t => t.id === cartItem.id);
        if(tour) {
            const itemTotal = parseFloat(tour.price) * cartItem.quantity;
            total += itemTotal;
            htmlItems += `
                <li class="list-group-item d-flex justify-content-between align-items-center px-0 bg-transparent">
                    <div>
                        <span class="fw-bold">${tour.name}</span> <small class="text-muted">x${cartItem.quantity}</small>
                        ${cartItem.note ? `<br><small class="text-muted fst-italic"><i class="bi bi-pen"></i> ${cartItem.note}</small>` : ''}
                    </div>
                    <span class="text-success fw-bold">$${itemTotal.toLocaleString()}</span>
                </li>`;
        }
    });
    htmlItems += '</ul>';

    $('#invoiceTotal').text(`$${total.toLocaleString()}`);
    $('#invoiceId').text(`TRV-${Date.now().toString().slice(-6)}`);
    $('#invoiceItems').html(htmlItems);

    const cartElement = document.getElementById('offcanvasCart');
    const cartOffcanvas = bootstrap.Offcanvas.getInstance(cartElement) || new bootstrap.Offcanvas(cartElement);
    cartOffcanvas.hide();

    new bootstrap.Modal(document.getElementById('invoiceModal')).show();
}

function clearCartUI() {
    appState.cart = [];
    updateCartStorage();
    renderCart();
    showToast(dictionary[appState.lang].cartCleared, 'success');
}

function toggleFavorite(e, id) {
    e.stopPropagation();
    const index = appState.favorites.findIndex(f => f.id === id);
    if (index === -1) {
        const tour = appState.tours.find(t => t.id === id);
        if(tour) {
            appState.favorites.push({ id: id, name: tour.name, note: "" });
            showToast(dictionary[appState.lang].msgAddedFav);
        }
    } else {
        appState.favorites.splice(index, 1);
    }
    const key = getUserKey('favTours');
    if (key) localStorage.setItem(key, JSON.stringify(appState.favorites));
    filterAndRender();
    renderFavorites();
}

function renderFavorites() {
    const container = $('#favListContainer');
    $('#favCount').text(appState.favorites.length);
    container.empty();

    if (appState.favorites.length === 0) {
        container.html('<p class="text-center text-muted small">Chưa có tour yêu thích</p>');
        return;
    }

    appState.favorites.forEach(fav => {
        const tour = appState.tours.find(c => c.id === fav.id);
        if (!tour) return;
        const html = `
            <div class="card border-0 shadow-sm">
                <div class="card-body p-2 d-flex gap-2 align-items-center">
                    <img src="${tour.image || tour.imageUrl}" class="rounded" width="50" height="50" style="object-fit:cover">
                    <div class="flex-grow-1 overflow-hidden">
                        <h6 class="mb-0 text-truncate small fw-bold">${tour.name}</h6>
                        <small class="text-danger">$${tour.price}</small>
                        ${fav.note ? `<div class="text-muted small fst-italic"><i class="bi bi-sticky"></i> ${fav.note}</div>` : ''}
                    </div>
                    <div class="d-flex flex-column gap-1">
                        <button class="btn btn-sm btn-outline-secondary py-0" onclick="openNoteModal('${fav.id}')"><i class="bi bi-journal-text"></i></button>
                        <button class="btn btn-sm btn-outline-danger py-0" onclick="toggleFavorite(event, '${fav.id}')"><i class="bi bi-x"></i></button>
                    </div>
                </div>
            </div>`;
        container.append(html);
    });
}

function openNoteModal(id) {
    const fav = appState.favorites.find(f => f.id === id);
    $('#noteTourId').val(id);
    $('#noteContent').val(fav.note || '');
    $('#noteModal').modal('show');
}

function saveNote() {
    const id = $('#noteTourId').val();
    const note = $('#noteContent').val();
    const fav = appState.favorites.find(f => f.id === id);
    if(fav) {
        fav.note = note;
        const key = getUserKey('favTours');
        if (key) localStorage.setItem(key, JSON.stringify(appState.favorites));
        renderFavorites();
        $('#noteModal').modal('hide');
    }
}

// ==========================================
// 8. USER MANAGEMENT
// ==========================================
function openUserManager() {
    if (appState.currentUser.email !== ADMIN_EMAIL) {
        showToast("Bạn không có quyền truy cập!", "danger");
        return;
    }
    $('#userModal').modal('show');
    $('#userListBody').empty();
    $('#userLoading').removeClass('d-none');

    $.get(ENDPOINT_USERS).done(users => {
        $('#userLoading').addClass('d-none');
        if (users.length === 0) {
            $('#userListBody').html('<tr><td colspan="5">Không có người dùng nào.</td></tr>');
            return;
        }
        let html = '';
        users.forEach((u, index) => {
            const isAdmin = u.email === ADMIN_EMAIL;
            const roleBadge = isAdmin ? '<span class="badge bg-warning text-dark">Admin</span>' : '<span class="badge bg-secondary">User</span>';
            const avatarLetter = u.name.charAt(0).toUpperCase();
            const deleteBtn = (u.email === appState.currentUser.email) 
                ? `<button class="btn btn-sm btn-light" disabled>Current</button>`
                : `<button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${u.id}')"><i class="bi bi-trash"></i> Xóa</button>`;

            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <div class="user-avatar">${avatarLetter}</div>
                            <span class="fw-bold">${u.name}</span>
                        </div>
                    </td>
                    <td>${u.email}</td>
                    <td>${roleBadge}</td>
                    <td>${deleteBtn}</td>
                </tr>`;
        });
        $('#userListBody').html(html);
    }).fail(() => {
        $('#userLoading').addClass('d-none');
        $('#userListBody').html('<tr><td colspan="5" class="text-danger">Lỗi tải dữ liệu!</td></tr>');
    });
}

function deleteUser(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa?")) return;
    $.ajax({
        url: `${ENDPOINT_USERS}/${id}`,
        type: 'DELETE',
        success: () => {
            showToast("Đã xóa người dùng!", "success");
            openUserManager();
        },
        error: () => showToast("Lỗi khi xóa người dùng!", "danger")
    });
}

// ==========================================
// 9. UTILITIES
// ==========================================
function showToast(msg, type = 'primary') {
    $('#toastMessage').text(msg);
    const toastEl = $('#liveToast');
    toastEl.removeClass('text-bg-primary text-bg-danger text-bg-success text-bg-warning').addClass(`text-bg-${type}`);
    const toast = new bootstrap.Toast(toastEl[0]);
    toast.show();
}

function toggleTheme() {
    appState.theme = appState.theme === 'light' ? 'dark' : 'light';
    applyTheme(appState.theme);
}

function applyTheme(theme) {
    $('html').attr('data-bs-theme', theme);
    localStorage.setItem('appTheme', theme);
    const icon = theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-stars-fill';
    $('#themeToggle i').attr('class', `bi ${icon}`);
}

function setLang(lang) {
    appState.lang = lang;
    applyLanguage(lang);
    filterAndRender();
    renderCart();
}

function applyLanguage(lang) {
    localStorage.setItem('appLang', lang);
    $('[data-i18n]').each(function() {
        const key = $(this).data('i18n');
        $(this).text(dictionary[lang][key] || key);
    });
    $('#btn-vi, #btn-en').removeClass('active');
    $(`#btn-${lang}`).addClass('active');
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function getUserKey(keyName) {
    if (!appState.currentUser || !appState.currentUser.email) return null;
    return `${keyName}_${appState.currentUser.email}`;
}