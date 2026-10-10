package com.impulse.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** {@code title} may be empty on the phone. {@code start}/{@code end} are ISO-8601 instants. */
public record SnapshotEventDto(
        @NotNull Integer id,
        @NotNull String title,
        @NotBlank String color,
        @NotBlank String start,
        @NotBlank String end,
        Boolean locked
) {}
