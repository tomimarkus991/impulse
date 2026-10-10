package com.impulse.api.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "preset")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Preset {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "preset_seq")
    @SequenceGenerator(name = "preset_seq", sequenceName = "preset_seq", allocationSize = 50)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    // The phone's id, so a snapshot round-trips exactly
    @Column(name = "local_id", nullable = false)
    private Integer localId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String color;

    @Column(nullable = false)
    private boolean locked;

    @Column(nullable = false)
    private boolean pinned;

    @Column(nullable = false)
    private int position;
}
