import { Injectable } from '@nestjs/common';
import { SpendClassificationResult } from '../interfaces/spend-classification-result.interface';

/**
 * Domain service for "spend -> category" classification.
 * Pure logic, no DB access.
 */
@Injectable()
export class SpendClassificationService {
  classify(
    text: string,
    catalog: Array<{ slug: string; name: string }>,
  ): SpendClassificationResult {
    const source = text.toLowerCase().trim();

    let best: SpendClassificationResult = {
      slug: null,
      confidence: 0,
      reason: 'No match',
    };

    for (const item of catalog) {
      const tokens = item.name
        .toLowerCase()
        .split(/[\s&/-]+/)
        .filter(Boolean);
      let score = 0;

      for (const token of tokens) {
        if (source.includes(token)) {
          score += 0.2;
        }
      }

      const boundedScore = Math.min(score, 0.95);

      if (boundedScore > best.confidence) {
        best = {
          slug: item.slug,
          confidence: boundedScore,
          reason: `Matched ${item.slug} with token score ${boundedScore.toFixed(2)}`,
        };
      }
    }

    return best;
  }
}
