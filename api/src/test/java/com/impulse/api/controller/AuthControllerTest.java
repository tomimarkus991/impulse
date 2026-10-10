package com.impulse.api.controller;

import com.impulse.api.IntegrationTest;
import com.impulse.api.service.GoogleTokenVerifier;
import com.impulse.api.service.GoogleTokenVerifier.GoogleIdentity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthControllerTest extends IntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GoogleTokenVerifier googleTokenVerifier;

    @Test
    void login_createsTheUserAndReturnsAWorkingToken() throws Exception {
        String sub = UUID.randomUUID().toString();
        when(googleTokenVerifier.verify("google-token")).thenReturn(new GoogleIdentity(sub, "tomi@example.com", "Tomi"));

        String body = login("google-token")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").isNumber())
                .andExpect(jsonPath("$.user.email").value("tomi@example.com"))
                .andExpect(jsonPath("$.user.name").value("Tomi"))
                .andExpect(jsonPath("$.snapshot").isEmpty())
                .andReturn().getResponse().getContentAsString();
        String token = body.replaceAll(".*\"token\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(get("/me/snapshot").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void login_reportsTheServerSnapshotAndUpdatesProfile() throws Exception {
        String sub = UUID.randomUUID().toString();
        when(googleTokenVerifier.verify("first")).thenReturn(new GoogleIdentity(sub, "old@example.com", "Old"));
        String body = login("first").andReturn().getResponse().getContentAsString();
        String token = body.replaceAll(".*\"token\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(put("/me/snapshot")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "app": "impulse", "version": 1, "presets": [],
                                  "events": [{ "id": 1, "title": "Push", "color": "#312e81", "start": "2026-10-09T08:00:00.000Z", "end": "2026-10-09T10:00:00.000Z" }] }
                                """))
                .andExpect(status().isOk());

        when(googleTokenVerifier.verify("second")).thenReturn(new GoogleIdentity(sub, "new@example.com", "New"));
        login("second")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("new@example.com"))
                .andExpect(jsonPath("$.user.name").value("New"))
                .andExpect(jsonPath("$.snapshot.events").value(1))
                .andExpect(jsonPath("$.snapshot.presets").value(0))
                .andExpect(jsonPath("$.snapshot.receivedAt").isNotEmpty());
    }

    @Test
    void login_rejectsAnInvalidGoogleToken() throws Exception {
        when(googleTokenVerifier.verify("forged"))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google token"));

        login("forged")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Invalid Google token"));
    }

    @Test
    void login_rejectsABlankToken() throws Exception {
        login(" ")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("idToken must not be blank"));
    }

    private ResultActions login(String idToken) throws Exception {
        return mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"idToken\":\"" + idToken + "\"}"));
    }
}
