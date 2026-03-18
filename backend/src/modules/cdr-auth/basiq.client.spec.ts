import { of, throwError } from 'rxjs';
import { BasiqClient } from './basiq.client';

describe('BasiqClient.createProviderUser', () => {
  const makeConfig = () =>
    ({
      get: jest.fn((key: string) => {
        switch (key) {
          case 'BASIQ_API_KEY':
            return 'basic-api-key';
          case 'BASIQ_API_BASE_URL':
            return 'https://au-api.basiq.io';
          case 'BASIQ_VERSION':
            return '3.0';
          default:
            return undefined;
        }
      }),
    }) as never;

  it('fails explicitly when the authenticated user profile is incomplete', async () => {
    const http = {
      post: jest.fn(),
      get: jest.fn(),
    } as never;
    const client = new BasiqClient(http, makeConfig());

    await expect(
      client.createProviderUser({
        email: 'user@example.com',
        fullName: '   ',
      }),
    ).rejects.toThrow(
      'Authenticated user email and full name are required before creating a Basiq identity.',
    );

    expect((http as any).post).not.toHaveBeenCalled();
    expect((http as any).get).not.toHaveBeenCalled();
  });

  it('reconciles an existing Basiq user by email after a create conflict', async () => {
    const http = {
      post: jest.fn((url: string) => {
        if (url.endsWith('/token')) {
          return of({
            data: {
              access_token: 'server-access-token',
              expires_in: 3600,
            },
          });
        }

        return throwError(() => ({
          response: {
            status: 409,
          },
        }));
      }),
      get: jest.fn().mockReturnValue(
        of({
          data: {
            data: [
              {
                id: 'basiq-user-123',
                email: 'user@example.com',
              },
            ],
          },
        }),
      ),
    } as never;
    const client = new BasiqClient(http, makeConfig());

    const result = await client.createProviderUser({
      email: 'user@example.com',
      fullName: 'User Example',
    });

    expect(result).toEqual({ providerUserId: 'basiq-user-123' });
    expect((http as any).get).toHaveBeenCalledWith(
      'https://au-api.basiq.io/users',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer server-access-token',
          'basiq-version': '3.0',
        }),
      }),
    );
  });

  it('maps reconciliation failures to a stable service error', async () => {
    const http = {
      post: jest.fn((url: string) => {
        if (url.endsWith('/token')) {
          return of({
            data: {
              access_token: 'server-access-token',
              expires_in: 3600,
            },
          });
        }

        return throwError(() => ({
          response: {
            status: 409,
          },
        }));
      }),
      get: jest.fn().mockReturnValue(
        throwError(() => new Error('network down')),
      ),
    } as never;
    const client = new BasiqClient(http, makeConfig());

    await expect(
      client.createProviderUser({
        email: 'user@example.com',
        fullName: 'User Example',
      }),
    ).rejects.toThrow(
      'Unable to reconcile an existing Basiq user for consent flow.',
    );
  });
});

describe('BasiqClient.createAuthorizeUrl', () => {
  it('fails explicitly when providerUserId is missing', async () => {
    const client = new BasiqClient(
      {
        post: jest.fn(),
        get: jest.fn(),
      } as never,
      ({
        get: jest.fn(),
      }) as never,
    );

    await expect(
      client.createAuthorizeUrl({
        state: 'state-1',
      } as never),
    ).rejects.toThrow(
      'Basiq consent requires a persisted provider user id before authorization can start.',
    );
  });
});
