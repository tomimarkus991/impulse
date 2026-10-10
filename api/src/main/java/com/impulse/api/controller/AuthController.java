package com.impulse.api.controller;

import com.impulse.api.dto.AuthRequestDto;
import com.impulse.api.dto.AuthResponseDto;
import com.impulse.api.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/google")
    public ResponseEntity<AuthResponseDto> googleAuth(@Valid @RequestBody AuthRequestDto request) {
        return ResponseEntity.ok(authService.googleLogin(request));
    }
}
