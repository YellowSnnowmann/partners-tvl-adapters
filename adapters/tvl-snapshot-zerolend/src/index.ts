import * as fs from 'fs';
import { write } from 'fast-csv';
import * as path from "path";
import { CHAINS, PROTOCOLS } from "./sdk/config";
import { getUserReservesForBlock, UserReserveData } from "./sdk/subgraphDetails";
import { getBlockByTimestamp } from './utils/helper';

interface CSVRow {
  user: string;
  token_address: string;
  block: number;
  token_balance: string;
  timestamp: number;
}

const mapUserReservesToCSVRows = async (
  userReserves: UserReserveData[],
  blockNumber: number
): Promise<CSVRow[]> => {
  const csvRows: CSVRow[] = [];

  for (const reserve of userReserves) {

    const timestamp = parseInt(reserve.lastUpdateTimestamp);
    const blockNumber = await getBlockByTimestamp(timestamp);

    csvRows.push({
      user: reserve.user.id,
      token_address: reserve.reserve.underlyingAsset,
      block: blockNumber,
      token_balance: reserve.currentATokenBalance,
      timestamp
    });
  }

  return csvRows;
};

const INITIAL_BLOCK = 2662044;
const OUTPUT_DIR = path.resolve(process.cwd(), "out");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "tvl-snapshot-zerolend.csv");
const getData = async () => {
  const csvRows: CSVRow[] = [];

  try {
    const userReserves = await getUserReservesForBlock(
      CHAINS.ZIRCUIT,
      PROTOCOLS.ZEROLEND,
      INITIAL_BLOCK
    );

    if (userReserves.length > 0) {
      const blockRows = await mapUserReservesToCSVRows(userReserves, INITIAL_BLOCK);
      csvRows.push(...blockRows);
    } else {
      console.log(`No data found for block ${INITIAL_BLOCK}`);
    }
  } catch (error) {
    console.error(`Error processing block ${INITIAL_BLOCK}:`, error);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const ws = fs.createWriteStream(OUTPUT_PATH

  );

  write(csvRows, { headers: true })
    .pipe(ws)
    .on('finish', () => {
      console.log("CSV file has been written to:", OUTPUT_PATH

      );
      console.log(`Total records: ${csvRows.length}`);
    });
};

getData()
  .then(() => {
    console.log("Done");
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });