package com.novel.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class ChapterRewriteResult {

    private String mode = "model-api";

    private String replacementText;

    private String conservativeText;

    private String expandedText;

    private String polishedText;

    private String intenseText;

    private List<String> riskNotes = new ArrayList<>();
}
