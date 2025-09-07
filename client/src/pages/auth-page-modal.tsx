// Seção modal limpa sem planos
const modalContent = `
          <div className="p-6 lg:p-12 bg-white">
            {modalType === 'login' ? (
              <LoginModal
                onSubmit={handleLoginSubmit}
                onSwitchToRegister={() => setModalType('register')}
                onSwitchToForgotPassword={() => setModalType('forgot-password')}
                isLoading={loginMutation.isPending}
              />
            ) : modalType === 'register' ? (
              <RegisterModal
                onSubmit={handleRegisterSubmit}
                onSwitchToLogin={() => setModalType('login')}
                isLoading={registerMutation.isPending}
                validationErrors={validationErrors}
                onFieldValidation={handleFieldValidation}
              />
            ) : modalType === 'forgot-password' ? (
              <ForgotPasswordModal
                onSubmitForgotPassword={handleForgotPasswordSubmit}
                onSubmitResetPassword={handleResetPasswordSubmit}
                onBackToLogin={() => setModalType('login')}
                isLoadingForgot={forgotPasswordMutation.isPending}
                isLoadingReset={resetPasswordMutation.isPending}
                resetEmailSent={resetEmailSent}
                showResetForm={showResetForm}
                setResetEmailSent={setResetEmailSent}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
`;