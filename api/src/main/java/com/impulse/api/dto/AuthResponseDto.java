package com.impulse.api.dto;

/** {@code snapshot} is null until the account has uploaded once. */
public record AuthResponseDto(
        String token,
        UserDto user,
        SnapshotInfoDto snapshot
) {}
