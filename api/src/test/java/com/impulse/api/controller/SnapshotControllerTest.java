package com.impulse.api.controller;

import com.impulse.api.IntegrationTest;
import com.impulse.api.model.AppUser;
import com.impulse.api.repository.AppUserRepository;
import com.impulse.api.service.TokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SnapshotControllerTest extends IntegrationTest {

    private static final String PATH = "/me/snapshot";

    // locked null, position missing: both normalise to defaults
    private static final String SNAPSHOT = """
            {
              "app": "impulse",
              "version": 1,
              "exportedAt": "2026-10-10T09:00:00.000Z",
              "events": [
                { "id": 7, "title": "Push", "color": "#312e81", "start": "2026-10-09T08:00:00.000Z", "end": "2026-10-09T10:00:00.000Z", "locked": null },
                { "id": 3, "title": "", "color": "#14532d", "start": "2026-10-08T21:00:00.000Z", "end": "2026-10-08T23:00:00.000Z", "locked": true }
              ],
              "presets": [
                { "id": 1, "title": "Push", "color": "#312e81", "locked": false, "pinned": true }
              ]
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private JwtEncoder jwtEncoder;

    private String token;

    @BeforeEach
    void createUser() {
        token = tokenFor(newUser());
    }

    @Test
    void putThenGet_roundTripsTheSnapshot() throws Exception {
        putSnapshot(token, SNAPSHOT)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.events").value(2))
                .andExpect(jsonPath("$.presets").value(1))
                .andExpect(jsonPath("$.receivedAt").isNotEmpty());

        mockMvc.perform(get(PATH).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.app").value("impulse"))
                .andExpect(jsonPath("$.version").value(1))
                // Ordered by the phone's id
                .andExpect(jsonPath("$.events[0].id").value(3))
                .andExpect(jsonPath("$.events[0].title").value(""))
                .andExpect(jsonPath("$.events[0].locked").value(true))
                .andExpect(jsonPath("$.events[1].id").value(7))
                .andExpect(jsonPath("$.events[1].title").value("Push"))
                .andExpect(jsonPath("$.events[1].color").value("#312e81"))
                .andExpect(jsonPath("$.events[1].start").value("2026-10-09T08:00:00.000Z"))
                .andExpect(jsonPath("$.events[1].end").value("2026-10-09T10:00:00.000Z"))
                .andExpect(jsonPath("$.events[1].locked").value(false))
                .andExpect(jsonPath("$.presets[0].id").value(1))
                .andExpect(jsonPath("$.presets[0].pinned").value(true))
                .andExpect(jsonPath("$.presets[0].locked").value(false))
                .andExpect(jsonPath("$.presets[0].position").value(0));
    }

    @Test
    void get_returnsEmptyArraysForANewAccount() throws Exception {
        mockMvc.perform(get(PATH).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.events").isEmpty())
                .andExpect(jsonPath("$.presets").isEmpty());
    }

    @Test
    void put_replacesOnlyTheCallersRows() throws Exception {
        String otherToken = tokenFor(newUser());
        putSnapshot(otherToken, SNAPSHOT).andExpect(status().isOk());

        putSnapshot(token, SNAPSHOT).andExpect(status().isOk());
        putSnapshot(token, """
                { "app": "impulse", "version": 1, "events": [], "presets": [] }
                """).andExpect(status().isOk());

        mockMvc.perform(get(PATH).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.events").isEmpty());
        mockMvc.perform(get(PATH).header("Authorization", "Bearer " + otherToken))
                .andExpect(jsonPath("$.events.length()").value(2))
                .andExpect(jsonPath("$.presets.length()").value(1));
    }

    @Test
    void put_rejectsAWrongVersion() throws Exception {
        putSnapshot(token, SNAPSHOT.replace("\"version\": 1", "\"version\": 2"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("version must be 1"));
    }

    @Test
    void put_rejectsABlankPresetTitle() throws Exception {
        putSnapshot(token, SNAPSHOT.replace("\"title\": \"Push\", \"color\": \"#312e81\", \"locked\": false", "\"title\": \" \", \"color\": \"#312e81\", \"locked\": false"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("presets[0].title must not be blank"));
    }

    @Test
    void put_rejectsAnInvalidDateAndKeepsTheOldRows() throws Exception {
        putSnapshot(token, SNAPSHOT).andExpect(status().isOk());

        putSnapshot(token, SNAPSHOT.replace("2026-10-09T08:00:00.000Z", "yesterday"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("events[0].start is not a valid date"));

        mockMvc.perform(get(PATH).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.events.length()").value(2));
    }

    @Test
    void put_rejectsMalformedJson() throws Exception {
        putSnapshot(token, "{ not json")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Malformed request body"));
    }

    @Test
    void put_rejectsSnapshotsOver5Mb() throws Exception {
        String huge = SNAPSHOT.replace("\"exportedAt\": \"", "\"exportedAt\": \"" + "x".repeat(5 * 1024 * 1024));

        putSnapshot(token, huge)
                .andExpect(status().isContentTooLarge())
                .andExpect(jsonPath("$.error").value("Snapshot is larger than 5 MB"));
    }

    @Test
    void returns401_whenNoAuthorizationHeader() throws Exception {
        mockMvc.perform(get(PATH))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    void returns401_whenBearerTokenIsInvalid() throws Exception {
        mockMvc.perform(get(PATH).header("Authorization", "Bearer not-a-real-jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void returns401_whenTokenHasExpired() throws Exception {
        AppUser user = newUser();
        Instant issuedAt = Instant.now().minus(Duration.ofDays(31));
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(String.valueOf(user.getId()))
                .issuedAt(issuedAt)
                .expiresAt(issuedAt.plus(Duration.ofDays(30)))
                .build();
        String expired = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();

        mockMvc.perform(get(PATH).header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void returns401_whenTheAccountNoLongerExists() throws Exception {
        AppUser user = newUser();
        String orphaned = tokenFor(user);
        userRepository.delete(user);

        mockMvc.perform(get(PATH).header("Authorization", "Bearer " + orphaned))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("User not found"));
    }

    private ResultActions putSnapshot(String bearer, String body) throws Exception {
        return mockMvc.perform(put(PATH)
                .header("Authorization", "Bearer " + bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private AppUser newUser() {
        String sub = UUID.randomUUID().toString();
        return userRepository.save(AppUser.builder().googleSub(sub).email(sub + "@example.com").build());
    }

    private String tokenFor(AppUser user) {
        return tokenService.generateToken(user.getId(), user.getEmail());
    }
}
