import { PublicKey } from '@solana/web3.js';

export class ValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
}

export function validateString(value: any, fieldName: string, minLength?: number, maxLength?: number): void {
  validateRequired(value, fieldName);

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName);
  }

  if (minLength !== undefined && value.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters`, fieldName);
  }

  if (maxLength !== undefined && value.length > maxLength) {
    throw new ValidationError(`${fieldName} must be at most ${maxLength} characters`, fieldName);
  }
}

export function validateMove(move: any): void {
  if (!move || typeof move !== 'string') {
    throw new ValidationError('Move must be a string', 'move');
  }
}

export function validateWalletAddress(address: any, fieldName: string = 'wallet'): void {
  validateString(address, fieldName);

  try {
    new PublicKey(address);
  } catch (error) {
    throw new ValidationError(`${fieldName} must be a valid Solana address`, fieldName);
  }
}

export function validateUrl(url: any, fieldName: string = 'url'): void {
  validateString(url, fieldName);

  try {
    new URL(url);
  } catch (error) {
    throw new ValidationError(`${fieldName} must be a valid URL`, fieldName);
  }
}

export function validateRegistration(body: any): {
  agentId: string;
  agentName: string;
  agentWallet: string;
  agentUrl?: string;
} {
  validateString(body.agentId, 'agentId', 1, 100);
  validateString(body.agentName, 'agentName', 1, 50);
  validateWalletAddress(body.agentWallet, 'agentWallet');

  if (body.agentUrl) {
    validateUrl(body.agentUrl, 'agentUrl');
  }

  return {
    agentId: body.agentId,
    agentName: body.agentName,
    agentWallet: body.agentWallet,
    agentUrl: body.agentUrl
  };
}

export function validateMoveRequest(body: any): {
  agentId: string;
  gameId: string;
  move: string;
} {
  validateString(body.agentId, 'agentId');
  validateString(body.gameId, 'gameId');
  validateMove(body.move);

  return {
    agentId: body.agentId,
    gameId: body.gameId,
    move: body.move
  };
}
