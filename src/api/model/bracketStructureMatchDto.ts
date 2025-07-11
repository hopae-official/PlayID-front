/**
 * Generated by orval v7.3.0 🍺
 * Do not edit manually.
 * Play.ID API
 * Esports API for Play.ID
 * OpenAPI spec version: 1.0
 */
import type { BracketStructureParticipantDto } from './bracketStructureParticipantDto';

export interface BracketStructureMatchDto {
  /** 세트 방식 (1=단판, 3=3판2선승, 5=5판3선승) */
  bestOf: number;
  /** 매치 번호 (1, 2, ...) */
  matchNumber: number;
  /** 매치 이름 */
  name?: string;
  /** 참가자 목록 */
  participants: BracketStructureParticipantDto[];
  /** 참가자 수 */
  participantsCount?: number;
  /** 이전 라운드 매치들의 임시 ID (진출 연결용) */
  prevTempMatchIds: string[];
  /** 배정 심판 ID 목록 */
  refereeIds: number[];
  /** 경기 일자 (YYYY-MM-DD) */
  scheduledDate: string;
  /** 경기 시간 (HH:mm:ss) */
  scheduledTime: string;
  /** 임시 매치 ID (프론트/초기화용) */
  tempId: string;
  /** 소속 라운드의 임시 ID */
  tempRoundId: string;
  /** 경기 장소 */
  venue: string;
}
