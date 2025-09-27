import handler from '../save-subscription';
import { promises as fs } from 'fs';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';

// Mock fs.readFile and fs.writeFile
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));

const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock HTTP request/response objects
const createMockReq = (method: string, body?: any): NextApiRequest =>
  ({
    method,
    body,
  } as NextApiRequest);

const createMockRes = () => {
  const res = {} as NextApiResponse;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};

describe('/api/save-subscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should save subscription with POST request', async () => {
    const req = createMockReq('POST', {
      endpoint: 'https://fcm.googleapis.com/fcm/send/example',
      keys: { p256dh: 'key1', auth: 'key2' },
    });
    const res = createMockRes();

    // Mock existing subscriptions file
    mockedFs.readFile.mockResolvedValueOnce('[]');
    mockedFs.writeFile.mockResolvedValueOnce(undefined as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(mockedFs.writeFile).toHaveBeenCalledWith(
      path.join(process.cwd(), 'subscriptions.json'),
      expect.stringContaining('fcm.googleapis.com')
    );
  });

  test('should handle file not existing initially', async () => {
    const req = createMockReq('POST', { endpoint: 'test-endpoint', keys: {} });
    const res = createMockRes();

    // Mock file not found error
    mockedFs.readFile.mockRejectedValueOnce(new Error('ENOENT'));
    mockedFs.writeFile.mockResolvedValueOnce(undefined as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockedFs.writeFile).toHaveBeenCalled();
  });

  test('should return 405 for non-POST requests', async () => {
    const req = createMockReq('GET');
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalled();
  });

  test('should append to existing subscriptions', async () => {
    const existingSubscriptions = [{ endpoint: 'existing-endpoint' }];
    const newSubscription = { endpoint: 'new-endpoint' };

    const req = createMockReq('POST', newSubscription);
    const res = createMockRes();

    mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(existingSubscriptions));
    mockedFs.writeFile.mockResolvedValueOnce(undefined as any);

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockedFs.writeFile).toHaveBeenCalledWith(
      path.join(process.cwd(), 'subscriptions.json'),
      JSON.stringify([...existingSubscriptions, newSubscription], null, 2)
    );
  });
});