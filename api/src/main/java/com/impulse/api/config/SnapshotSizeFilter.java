package com.impulse.api.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Spring's multipart limits don't apply to JSON bodies, so snapshot uploads are capped here.
 * The phone's fetch always sends Content-Length, so a missing one is rejected too.
 */
@Component
public class SnapshotSizeFilter extends OncePerRequestFilter {

    public static final long MAX_BYTES = 5 * 1024 * 1024;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return !("PUT".equals(request.getMethod()) && "/me/snapshot".equals(path));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long length = request.getContentLengthLong();
        if (length < 0 || length > MAX_BYTES) {
            response.setStatus(HttpStatus.CONTENT_TOO_LARGE.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"error\":\"Snapshot is larger than 5 MB\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
