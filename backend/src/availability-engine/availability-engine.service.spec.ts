import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { AvailabilityService } from "./availability-engine.service";

describe("AvailabilityEngineService", () => {
  let service: AvailabilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: PrismaService,
          useValue: {
            availabilityBlock: {
              deleteMany: jest.fn(),
            },
            booking: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
            extraService: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
