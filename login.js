// ==========================================================
// LÓGICA DA TELA DE LOGIN E CADASTRO (index.html)
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    // Seleciona os elementos de forma flexível (por ID ou seletores do formulário)
    const loginForm = document.getElementById('loginForm') || document.querySelector('form');
    const inputLogin = document.getElementById('inputLogin') || document.getElementById('username') || document.querySelector('input[type="text"], input[type="email"]');
    const inputSenha = document.getElementById('inputSenha') || document.getElementById('password') || document.querySelector('input[type="password"]');
    const togglePassword = document.getElementById('togglePassword') || document.querySelector('.toggle-password');
    const habboAvatar = document.getElementById('habboAvatar');

    // Modal de Registro
    const registerModal = document.getElementById('registerModal');
    const btnCriarContaModal = document.getElementById('btnCriarContaModal') || document.getElementById('registerBtn');
    const btnModalCancel = document.getElementById('btnModalCancel') || document.getElementById('closeModalBtn');
    const registerForm = document.getElementById('registerForm');
    const regEmail = document.getElementById('regEmail');
    const regUser = document.getElementById('regUser');
    const regPassword = document.getElementById('regPassword');
    const toggleRegPassword = document.getElementById('toggleRegPassword');

    // 1. Alternar visibilidade da senha (Login)
    if (togglePassword && inputSenha) {
        togglePassword.addEventListener('click', () => {
            const type = inputSenha.getAttribute('type') === 'password' ? 'text' : 'password';
            inputSenha.setAttribute('type', type);
            togglePassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
        });
    }

    // 2. Alternar visibilidade da senha (Registro)
    if (toggleRegPassword && regPassword) {
        toggleRegPassword.addEventListener('click', () => {
            const type = regPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            regPassword.setAttribute('type', type);
            toggleRegPassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
        });
    }

    // 3. Atualizar Avatar do Habbo dinamicamente ao digitar o Nick
    if (inputLogin && habboAvatar) {
        inputLogin.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (val && !val.includes('@')) {
                habboAvatar.src = `https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(val)}&action=wav&direction=2&head_direction=2&gesture=sml&size=m`;
            }
        });
    }

    // 4. ABRIR / FECHAR MODAL DE CADASTRO
    if (btnCriarContaModal && registerModal) {
        btnCriarContaModal.addEventListener('click', () => {
            registerModal.classList.add('active');
        });
    }

    if (btnModalCancel && registerModal) {
        btnModalCancel.addEventListener('click', () => {
            registerModal.classList.remove('active');
        });
    }

    // 5. REALIZAR LOGIN
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!inputLogin || !inputSenha) {
                alert('⚠️ Erro: Campos de login não encontrados no HTML.');
                return;
            }

            const identifier = inputLogin.value.trim();
            const password = inputSenha.value;

            if (!supabaseClient) {
                alert('⚠️ Erro: O Supabase não foi inicializado.');
                return;
            }

            try {
                let emailToLogin = identifier;

                // Se digitou o Nick, busca o e-mail na tabela 'profiles'
                if (!identifier.includes('@')) {
                    const { data: profileData, error: profileError } = await supabaseClient
                        .from('profiles')
                        .select('email, status')
                        .eq('nick_habbo', identifier)
                        .single();

                    if (profileError || !profileData) {
                        alert('❌ Nick não encontrado. Verifique o nome digitado ou entre com seu e-mail.');
                        return;
                    }

                    if (profileData.status === 'pendente') {
                        alert('⏳ Sua conta está pendente de aprovação por um Administrador.');
                        return;
                    }

                    emailToLogin = profileData.email;
                }

                // Autentica com o Supabase Auth
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: emailToLogin,
                    password: password
                });

                if (error) {
                    alert('❌ E-mail ou senha incorretos.');
                    return;
                }

                window.location.href = 'dashboard.html';

            } catch (err) {
                console.error("Erro no login:", err);
                alert('❌ Ocorreu um erro ao tentar fazer login.');
            }
        });
    }

    // 6. REALIZAR CADASTRO (CRIAR CONTA)
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = regEmail ? regEmail.value.trim() : '';
            const nick = regUser ? regUser.value.trim() : '';
            const password = regPassword ? regPassword.value : '';

            if (!email || !nick || !password) {
                alert('⚠️ Preencha todos os campos para se cadastrar.');
                return;
            }

            if (!supabaseClient) {
                alert('⚠️ Erro: O Supabase não foi inicializado.');
                return;
            }

            try {
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: { nick_habbo: nick }
                    }
                });

                if (error) {
                    alert('❌ Erro ao cadastrar: ' + error.message);
                    return;
                }

                if (data && data.user) {
                    const { error: insertError } = await supabaseClient.from('profiles').insert([
                        { id: data.user.id, email: email, nick_habbo: nick, cargo: 'Membro', status: 'pendente' }
                    ]);

                    if (insertError) {
                        alert('❌ Erro ao salvar o perfil no banco: ' + insertError.message);
                        return;
                    }
                }

                alert('✅ Conta criada com sucesso! Aguarde a aprovação do Administrador.');
                if (registerModal) registerModal.classList.remove('active');
                registerForm.reset();

            } catch (err) {
                console.error("Erro inesperado no cadastro:", err);
                alert('❌ Ocorreu um erro inesperado no cadastro.');
            }
        });
    }
});