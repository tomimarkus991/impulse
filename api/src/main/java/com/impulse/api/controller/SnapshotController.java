package com.impulse.api.controller;

import com.impulse.api.dto.SnapshotDto;
import com.impulse.api.dto.SnapshotInfoDto;
import com.impulse.api.service.SnapshotService;
import com.impulse.api.util.JwtUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/me/snapshot")
@RequiredArgsConstructor
public class SnapshotController {
    private final SnapshotService snapshotService;

    @PutMapping
    public ResponseEntity<SnapshotInfoDto> replaceSnapshot(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SnapshotDto snapshot
    ) {
        return ResponseEntity.ok(snapshotService.replace(JwtUtils.extractUserId(jwt), snapshot));
    }

    @GetMapping
    public ResponseEntity<SnapshotDto> getSnapshot(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(snapshotService.get(JwtUtils.extractUserId(jwt)));
    }
}
