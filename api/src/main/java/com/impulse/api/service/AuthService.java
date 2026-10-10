package com.impulse.api.service;

import com.impulse.api.dto.AuthRequestDto;
import com.impulse.api.dto.AuthResponseDto;
import com.impulse.api.dto.UserDto;
import com.impulse.api.model.AppUser;
import com.impulse.api.repository.AppUserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class AuthService {

    public static final String DEV_GOOGLE_SUB = "dev";

    private final TokenService tokenService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final SnapshotService snapshotService;
    private final AppUserRepository userRepository;

    private final boolean skipGoogleVerification;
    private final String devUserEmail;

    public AuthService(
            TokenService tokenService,
            GoogleTokenVerifier googleTokenVerifier,
            SnapshotService snapshotService,
            AppUserRepository userRepository,
            Environment environment,
            @Value("${app.auth.skip-google-verification:false}") boolean skipGoogleVerification,
            @Value("${app.auth.dev-user-email:#{null}}") String devUserEmail) {

        this.tokenService = tokenService;
        this.googleTokenVerifier = googleTokenVerifier;
        this.snapshotService = snapshotService;
        this.userRepository = userRepository;
        this.skipGoogleVerification = skipGoogleVerification;
        this.devUserEmail = devUserEmail;

        if (skipGoogleVerification && !environment.matchesProfiles("dev")) {
            throw new IllegalStateException("FATAL: Google Auth bypass is enabled outside the 'dev' profile.");
        }

        if (skipGoogleVerification && (devUserEmail == null || devUserEmail.isBlank())) {
            throw new IllegalStateException("FATAL: Google Auth bypass is enabled, but 'app.auth.dev-user-email' is missing in your properties/env.");
        }

        if (skipGoogleVerification) {
            log.warn("SECURITY: Google authentication verification is DISABLED. Dev bypass is active — all login requests will authenticate as '{}'.", devUserEmail);
        }
    }

    @Transactional
    public AuthResponseDto googleLogin(AuthRequestDto request) {
        AppUser user = skipGoogleVerification
                ? getOrCreateDevUser()
                : getOrCreateGoogleUser(googleTokenVerifier.verify(request.idToken()));

        String token = tokenService.generateToken(user.getId(), user.getEmail());
        UserDto userDto = new UserDto(user.getId(), user.getEmail(), user.getName());

        return new AuthResponseDto(token, userDto, snapshotService.getInfo(user));
    }

    @Transactional
    public AppUser getOrCreateDevUser() {
        return getOrCreateUser(DEV_GOOGLE_SUB, devUserEmail, "Dev User");
    }

    private AppUser getOrCreateGoogleUser(GoogleTokenVerifier.GoogleIdentity identity) {
        return getOrCreateUser(identity.sub(), identity.email(), identity.name());
    }

    // Email and name can change on Google's side, so they're refreshed on every login
    private AppUser getOrCreateUser(String googleSub, String email, String name) {
        AppUser user = userRepository.findByGoogleSub(googleSub)
                .orElseGet(() -> AppUser.builder().googleSub(googleSub).build());
        user.setEmail(email);
        user.setName(name);
        return userRepository.save(user);
    }
}
