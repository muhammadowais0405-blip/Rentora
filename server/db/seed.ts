import type Database from 'better-sqlite3';
import crypto from 'node:crypto';

function hashDemoPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function addDaysIso(offsetDays: number): string {
  const now = new Date();
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(base + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

export function seedDatabase(db: Database.Database, forceReset = false): void {
  const existingCount = (
    db.prepare('SELECT COUNT(*) AS count FROM categories').get() as { count: number }
  ).count;

  if (existingCount > 0 && !forceReset) {
    return;
  }

  const runSeed = db.transaction(() => {
    if (forceReset) {
      db.exec(`
        DELETE FROM listing_reports;
        DELETE FROM demo_promotions;
        DELETE FROM notifications;
        DELETE FROM reviews;
        DELETE FROM booking_status_history;
        DELETE FROM bookings;
        DELETE FROM favorites;
        DELETE FROM listing_images;
        DELETE FROM listings;
        DELETE FROM categories;
        DELETE FROM users;
        DELETE FROM sqlite_sequence;
      `);
    }

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, phone, email_verified_demo, phone_verified_demo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const demoPassHash = hashDemoPassword('rentora-demo-2026');
    const ahmedId = Number(
      insertUser.run(
        'Ahmed Khan',
        'owner@rentora.demo',
        demoPassHash,
        'user',
        '+92 300 4128901',
        1,
        1,
        '2025-09-12',
      ).lastInsertRowid,
    );
    const saraId = Number(
      insertUser.run(
        'Sara Malik',
        'renter@rentora.demo',
        demoPassHash,
        'user',
        '+92 321 8845120',
        1,
        1,
        '2025-10-03',
      ).lastInsertRowid,
    );
    const zainId = Number(
      insertUser.run(
        'Zain Tariq',
        'zain@rentora.demo',
        demoPassHash,
        'user',
        '+92 333 9104422',
        1,
        0,
        '2026-01-14',
      ).lastInsertRowid,
    );
    insertUser.run(
      'Rentora Moderator',
      'admin@rentora.demo',
      demoPassHash,
      'admin',
      '+92 300 0000001',
      1,
      1,
      '2025-08-01',
    );

    const insertCategory = db.prepare(`
      INSERT INTO categories (name, slug, description, image_path, subcategories_json)
      VALUES (?, ?, ?, ?, ?)
    `);

    const catCameras = Number(
      insertCategory.run(
        'Cameras & Photography',
        'cameras-photography',
        'Mirrorless bodies, DSLR kits, prime lenses, action cameras, and lighting rigs for student shoots and events.',
        '/src/assets/images/item_sony_camera_1794844411004.jpg',
        JSON.stringify(['Mirrorless', 'DSLR', 'Action Cam']),
      ).lastInsertRowid,
    );
    const catGaming = Number(
      insertCategory.run(
        'Gaming Consoles',
        'gaming-consoles',
        'PlayStation 5, Xbox consoles, dual wireless controllers, and weekend co-op setups ready to plug and play.',
        '/src/assets/images/item_ps5_console_1794844413476.jpg',
        JSON.stringify(['PlayStation', 'Xbox', 'Co-op Kits']),
      ).lastInsertRowid,
    );
    const catBikes = Number(
      insertCategory.run(
        'Bikes & Cycles',
        'bikes-cycles',
        'Lightweight road bikes, trail mountain bikes, and commuter cycles tuned for campus rides and weekend trails.',
        '/src/assets/images/item_road_bike_1794844413385.jpg',
        JSON.stringify(['Road & Gravel', 'Mountain', 'City Hybrid']),
      ).lastInsertRowid,
    );
    const catElectronics = Number(
      insertCategory.run(
        'Electronics & Equipment',
        'electronics-equipment',
        'Portable smart projectors, creative ultrabooks, audio interfaces, and presentation gear without buying new.',
        '/src/assets/images/item_projector_xgimi_1794844413404.jpg',
        JSON.stringify(['Projectors', 'Laptops', 'Audio & Presentation']),
      ).lastInsertRowid,
    );

    const insertListing = db.prepare(`
      INSERT INTO listings (
        owner_id, category_id, subcategory, title, description, condition,
        daily_price, deposit_amount, location_text, specs_json, status, is_featured, featured_until
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `);

    const insertImage = db.prepare(`
      INSERT INTO listing_images (listing_id, file_path, is_cover, sort_order)
      VALUES (?, ?, ?, ?)
    `);

    const seededItems: Array<{
      ownerId: number;
      categoryId: number;
      subcategory: string;
      title: string;
      description: string;
      condition: string;
      dailyPrice: number;
      depositAmount: number;
      locationText: string;
      specs: Record<string, string>;
      isFeatured: number;
      images: string[];
    }> = [
      {
        ownerId: ahmedId,
        categoryId: catCameras,
        subcategory: 'Mirrorless',
        title: 'Sony A7 III Full-Frame Kit',
        description:
          '24.2MP full-frame mirrorless camera paired with the Sony FE 28-70mm f/3.5-5.6 OSS lens. Ideal for university film assignments, graduation portraits, and event coverage. Includes two NP-FZ100 batteries, dual charger, 64GB UHS-II SD card, and padded shoulder bag.',
        condition: 'Like New',
        dailyPrice: 2500,
        depositAmount: 12000,
        locationText: 'Gulberg III, Lahore',
        specs: {
          Sensor: '24.2MP Full-Frame Exmor R',
          Lens: 'FE 28-70mm f/3.5-5.6 OSS',
          Video: '4K HDR (30fps) / 1080p (120fps)',
          Included: '2 Batteries, Charger, 64GB SD, Strap',
        },
        isFeatured: 1,
        images: [
          '/src/assets/images/item_sony_camera_1794844411004.jpg',
          '/src/assets/images/item_canon_camera_1794844413274.jpg',
        ],
      },
      {
        ownerId: zainId,
        categoryId: catCameras,
        subcategory: 'Mirrorless',
        title: 'Canon EOS R6 + RF 50mm f/1.8',
        description:
          'Fast autofocus and crisp low-light performance with Canon RF 50mm prime lens. Great for portrait shoots, interviews, and short documentaries. Clean sensor, scratch-free LCD, and protective carry case included.',
        condition: 'Excellent',
        dailyPrice: 2200,
        depositAmount: 10000,
        locationText: 'DHA Phase 5, Lahore',
        specs: {
          Sensor: '20.1MP Full-Frame CMOS',
          Lens: 'RF 50mm f/1.8 STM Prime',
          Stabilization: 'Up to 8-stop IBIS',
          Included: '2 LP-E6NH Batteries, Charger, Bag',
        },
        isFeatured: 0,
        images: [
          '/src/assets/images/item_canon_camera_1794844413274.jpg',
          '/src/assets/images/item_sony_camera_1794844411004.jpg',
        ],
      },
      {
        ownerId: ahmedId,
        categoryId: catCameras,
        subcategory: 'Action Cam',
        title: 'GoPro Hero 12 Adventure Bundle',
        description:
          'Waterproof 5.3K action camera with HyperSmooth 6.0 stabilization. Ready for northern area road trips, cycling POV footage, and outdoor sports clubs. Comes with chest mount, floating grip, and 128GB microSD.',
        condition: 'Like New',
        dailyPrice: 1500,
        depositAmount: 5000,
        locationText: 'Model Town, Lahore',
        specs: {
          Resolution: '5.3K60 / 4K120 Video',
          Waterproof: 'Up to 10m without housing',
          Batteries: '2 Enduro Batteries Included',
          Included: 'Chest Mount, Grip, 128GB microSD',
        },
        isFeatured: 0,
        images: ['/src/assets/images/item_gopro_action_1794844412734.jpg'],
      },
      {
        ownerId: ahmedId,
        categoryId: catGaming,
        subcategory: 'PlayStation',
        title: 'PlayStation 5 Disc Edition + 2 Controllers',
        description:
          'PS5 console with two DualSense wireless controllers, HDMI 2.1 cable, and pre-installed FIFA / co-op party titles. Perfect for hostel tournaments, weekend hangouts, and society gaming nights.',
        condition: 'Like New',
        dailyPrice: 3000,
        depositAmount: 15000,
        locationText: 'Johar Town, Lahore',
        specs: {
          Storage: '825GB NVMe SSD',
          Controllers: '2x DualSense Wireless',
          Output: '4K up to 120Hz HDMI 2.1',
          Included: 'Console, 2 Pads, Power & HDMI Cables',
        },
        isFeatured: 1,
        images: [
          '/src/assets/images/item_ps5_console_1794844413476.jpg',
          '/src/assets/images/item_xbox_vr_1794844413912.jpg',
        ],
      },
      {
        ownerId: zainId,
        categoryId: catGaming,
        subcategory: 'Xbox',
        title: 'Xbox Series X 1TB + Game Pass Setup',
        description:
          'Quiet matte-black 4K console with wireless controller and rechargeable play-and-charge kit. Ideal for weekend racing, Halo co-op, or big-screen projector sessions.',
        condition: 'Excellent',
        dailyPrice: 2400,
        depositAmount: 12000,
        locationText: 'F-7 Markaz, Islamabad',
        specs: {
          Storage: '1TB Custom NVMe SSD',
          Controllers: '1x Matte Black Wireless + Charge Kit',
          Resolution: 'True 4K 120fps Support',
          Included: 'Console, Controller, High-Speed HDMI',
        },
        isFeatured: 0,
        images: ['/src/assets/images/item_xbox_vr_1794844413912.jpg'],
      },
      {
        ownerId: saraId,
        categoryId: catGaming,
        subcategory: 'Co-op Kits',
        title: 'PS5 Weekend Party Bundle (4 Controllers)',
        description:
          'Full 4-player couch co-op kit with charging dock and protective travel hardshell case. Book for campus gaming events or weekend get-togethers.',
        condition: 'Excellent',
        dailyPrice: 3500,
        depositAmount: 15000,
        locationText: 'Bahria Town, Islamabad',
        specs: {
          Controllers: '4x DualSense + Dual Charging Dock',
          Case: 'Foam-Padded Travel Carry Case',
          Games: 'EA FC, Tekken 8, Rocket League Ready',
          Included: 'Console, 4 Controllers, Dock, Case',
        },
        isFeatured: 0,
        images: ['/src/assets/images/item_ps5_console_1794844413476.jpg'],
      },
      {
        ownerId: zainId,
        categoryId: catBikes,
        subcategory: 'Road & Gravel',
        title: 'Canyon Aero Road Bike — Size M (54cm)',
        description:
          'Lightweight carbon-fork road bicycle with Shimano 105 drivetrain and hydraulic disc brakes. Freshly serviced for smooth morning group rides and fitness endurance routes.',
        condition: 'Like New',
        dailyPrice: 1800,
        depositAmount: 8000,
        locationText: 'DHA Phase 6, Lahore',
        specs: {
          Frame: '54cm Aero Alloy/Carbon (172-182cm)',
          Groupset: 'Shimano 105 11-Speed',
          Brakes: 'Hydraulic Disc Brakes',
          Included: 'Helmet, U-Lock, Bottle Cage, Pump',
        },
        isFeatured: 1,
        images: [
          '/src/assets/images/item_road_bike_1794844413385.jpg',
          '/src/assets/images/item_mountain_bike_1794844412992.jpg',
        ],
      },
      {
        ownerId: ahmedId,
        categoryId: catBikes,
        subcategory: 'Mountain',
        title: 'TrailBlazer 29er Full-Suspension MTB',
        description:
          'Rugged 29-inch trail mountain bike with 140mm front suspension fork and wide tubeless tires. Great for Margalla trails or weekend off-road club rides.',
        condition: 'Excellent',
        dailyPrice: 1600,
        depositAmount: 7000,
        locationText: 'E-7 Hillside, Islamabad',
        specs: {
          WheelSize: '29-inch Tubeless Ready',
          Suspension: '140mm Air Fork + Rear Shock',
          Drivetrain: '1x12 Wide-Range',
          Included: 'Trail Helmet, Mini Pump, Cable Lock',
        },
        isFeatured: 0,
        images: ['/src/assets/images/item_mountain_bike_1794844412992.jpg'],
      },
      {
        ownerId: saraId,
        categoryId: catBikes,
        subcategory: 'City Hybrid',
        title: 'Urban Commuter Cycle + Helmet & Lock',
        description:
          'Fast, comfortable campus commuter bike tuned for paved university roads and evening rides. Includes front/rear rechargeable LED lights and sturdy U-lock.',
        condition: 'Good',
        dailyPrice: 1100,
        depositAmount: 4000,
        locationText: 'Clifton Block 5, Karachi',
        specs: {
          Frame: 'Medium Step-Over Lightweight Alloy',
          Gears: '8-Speed Easy-Shift',
          Tires: '700x32c Puncture-Protected',
          Included: 'Helmet, LED Lights, Heavy U-Lock',
        },
        isFeatured: 0,
        images: ['/src/assets/images/item_road_bike_1794844413385.jpg'],
      },
      {
        ownerId: ahmedId,
        categoryId: catElectronics,
        subcategory: 'Projectors',
        title: 'XGIMI Halo+ Portable 1080p Projector',
        description:
          'Compact battery-powered Full HD smart projector with built-in Harman Kardon speakers and auto keystone correction. Ideal for rooftop movie nights, thesis pitches, and workshop demos.',
        condition: 'Like New',
        dailyPrice: 1800,
        depositAmount: 8000,
        locationText: 'Gulberg II, Lahore',
        specs: {
          Resolution: '1080p Full HD (700 ISO Lumens)',
          Battery: '2.5 Hours Built-In Playtime',
          Audio: 'Dual 5W Harman Kardon Speakers',
          Included: 'Mini Tripod, HDMI Cable, Remote, Case',
        },
        isFeatured: 1,
        images: [
          '/src/assets/images/item_projector_xgimi_1794844413404.jpg',
          '/src/assets/images/item_laptop_pro_1794844414914.jpg',
        ],
      },
      {
        ownerId: zainId,
        categoryId: catElectronics,
        subcategory: 'Laptops',
        title: 'Creator Ultrabook Pro 14 (32GB RAM)',
        description:
          'High-memory aluminum creator laptop ready for Premiere Pro video editing, CAD demos, and hackathon weekends. Clean keyboard, crisp color-accurate display, and 96W USB-C charger.',
        condition: 'Like New',
        dailyPrice: 2800,
        depositAmount: 14000,
        locationText: 'PECHS Block 2, Karachi',
        specs: {
          Display: '14-inch 2.8K Anti-Glare IPS',
          Memory: '32GB LPDDR5 / 1TB NVMe SSD',
          Ports: 'Thunderbolt 4, HDMI 2.1, SD Reader',
          Included: '96W GaN Charger, Protective Sleeve',
        },
        isFeatured: 0,
        images: ['/src/assets/images/item_laptop_pro_1794844414914.jpg'],
      },
      {
        ownerId: saraId,
        categoryId: catElectronics,
        subcategory: 'Audio & Presentation',
        title: 'Lecture & Event Projector + Ultrabook Kit',
        description:
          'Combined presentation setup pairing a portable smart 1080p projector with a clean presentation laptop and HDMI clicker. Built for student society seminars and project showcases.',
        condition: 'Excellent',
        dailyPrice: 3200,
        depositAmount: 15000,
        locationText: 'University Town, Peshawar',
        specs: {
          Kit: '1080p Smart Projector + 14" Ultrabook',
          Connectivity: 'HDMI, USB-C, Wireless Cast',
          SetupTime: 'Under 3 Minutes Auto-Focus',
          Included: 'Projector, Laptop, Clicker, Cables',
        },
        isFeatured: 0,
        images: [
          '/src/assets/images/item_projector_xgimi_1794844413404.jpg',
          '/src/assets/images/item_laptop_pro_1794844414914.jpg',
        ],
      },
    ];

    const listingIds: number[] = [];
    for (const item of seededItems) {
      const listingId = Number(
        insertListing.run(
          item.ownerId,
          item.categoryId,
          item.subcategory,
          item.title,
          item.description,
          item.condition,
          item.dailyPrice,
          item.depositAmount,
          item.locationText,
          JSON.stringify(item.specs),
          item.isFeatured,
          item.isFeatured ? addDaysIso(30) : null,
        ).lastInsertRowid,
      );
      listingIds.push(listingId);

      item.images.forEach((imgPath, index) => {
        insertImage.run(listingId, imgPath, index === 0 ? 1 : 0, index);
      });
    }

    // Pending listing (ID 13) for Admin Moderator Queue demonstration
    const pendingModerationListingId = Number(
      db
        .prepare(
          `
          INSERT INTO listings (
            owner_id, category_id, subcategory, title, description, condition,
            daily_price, deposit_amount, location_text, specs_json, status, is_featured, featured_until
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL)
          `,
        )
        .run(
          zainId,
          catCameras,
          'Action Cam',
          'DJI Action 4 Creator Gimbal & Chest Mount Kit',
          'Compact 4K stabilization action kit with magnetic quick-release mount and dual batteries, submitted by owner and awaiting moderator review.',
          'Like New',
          1700,
          6000,
          'F-10 Markaz, Islamabad',
          JSON.stringify({
            Resolution: '4K 120fps HDR',
            Included: '2 Batteries, Chest Mount, Mini Tripod',
          }),
        ).lastInsertRowid,
    );
    insertImage.run(
      pendingModerationListingId,
      '/src/assets/images/item_gopro_action_1794844412734.jpg',
      1,
      0,
    );

    // Seed sample completed, approved & pending bookings + authentic reviews
    const insertBooking = db.prepare(`
      INSERT INTO bookings (
        listing_id, renter_id, owner_id, start_date, end_date,
        rental_days, daily_price_snapshot, rental_total, deposit_snapshot, status, payment_status, paid_demo_at, renter_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertHistory = db.prepare(`
      INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by)
      VALUES (?, ?, ?, ?)
    `);

    const insertReview = db.prepare(`
      INSERT INTO reviews (booking_id, listing_id, reviewer_id, reviewee_id, rating, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const sonyId = listingIds[0];
    const canonId = listingIds[1];
    const goproId = listingIds[2];
    const ps5Id = listingIds[3];
    const roadBikeId = listingIds[6];
    const projectorId = listingIds[9];

    // Completed booking for Sony A7 III + review
    const completedSonyBooking = Number(
      insertBooking.run(
        sonyId,
        saraId,
        ahmedId,
        '2026-10-10',
        '2026-10-13',
        3,
        2500,
        7500,
        12000,
        'completed',
        'paid_demo',
        '2026-10-10 10:00:00',
        'Picking up after morning lecture at 11 AM.',
      ).lastInsertRowid,
    );
    insertHistory.run(completedSonyBooking, null, 'pending', saraId);
    insertHistory.run(completedSonyBooking, 'pending', 'approved', ahmedId);
    insertHistory.run(completedSonyBooking, 'approved', 'completed', ahmedId);
    insertReview.run(
      completedSonyBooking,
      sonyId,
      saraId,
      ahmedId,
      5,
      'Sensor was spotless and both batteries came fully charged. Pickup near Gulberg took five minutes.',
      '2026-10-14',
    );

    const completedSonyBooking2 = Number(
      insertBooking.run(
        sonyId,
        zainId,
        ahmedId,
        '2026-10-20',
        '2026-10-22',
        2,
        2500,
        5000,
        12000,
        'completed',
        'paid_demo',
        '2026-10-20 09:30:00',
        'Student short film weekend shoot.',
      ).lastInsertRowid,
    );
    insertHistory.run(completedSonyBooking2, null, 'pending', zainId);
    insertHistory.run(completedSonyBooking2, 'pending', 'approved', ahmedId);
    insertHistory.run(completedSonyBooking2, 'approved', 'completed', ahmedId);
    insertReview.run(
      completedSonyBooking2,
      sonyId,
      zainId,
      ahmedId,
      5,
      'Used this for our society short film. Great low-light quality and super smooth handover.',
      '2026-10-23',
    );

    // Upcoming approved booking window on Sony A7 III (unpaid demo payment ready to confirm)
    const approvedSonyUpcoming = Number(
      insertBooking.run(
        sonyId,
        saraId,
        ahmedId,
        addDaysIso(8),
        addDaysIso(11),
        3,
        2500,
        7500,
        12000,
        'approved',
        'unpaid',
        null,
        'Need for campus documentary interviews.',
      ).lastInsertRowid,
    );
    insertHistory.run(approvedSonyUpcoming, null, 'pending', saraId);
    insertHistory.run(approvedSonyUpcoming, 'pending', 'approved', ahmedId);

    // Pending incoming request from Sara to Ahmed on GoPro Hero 12
    const pendingGoProBooking = Number(
      insertBooking.run(
        goproId,
        saraId,
        ahmedId,
        addDaysIso(14),
        addDaysIso(16),
        2,
        1500,
        3000,
        5000,
        'pending',
        'unpaid',
        null,
        'Weekend hiking club trip, need chest mount too if available.',
      ).lastInsertRowid,
    );
    insertHistory.run(pendingGoProBooking, null, 'pending', saraId);

    // Reviews on other featured listings
    const completedCanonBooking = Number(
      insertBooking.run(
        canonId,
        saraId,
        zainId,
        '2026-10-15',
        '2026-10-17',
        2,
        2200,
        4400,
        10000,
        'completed',
        'paid_demo',
        '2026-10-15 14:00:00',
        '',
      ).lastInsertRowid,
    );
    insertReview.run(
      completedCanonBooking,
      canonId,
      saraId,
      zainId,
      5,
      'The RF 50mm prime lens is razor sharp for portraits. Everything matched the description.',
      '2026-10-18',
    );

    const completedPs5Booking = Number(
      insertBooking.run(
        ps5Id,
        zainId,
        ahmedId,
        '2026-10-18',
        '2026-10-20',
        2,
        3000,
        6000,
        15000,
        'completed',
        'paid_demo',
        '2026-10-18 16:00:00',
        '',
      ).lastInsertRowid,
    );
    insertReview.run(
      completedPs5Booking,
      ps5Id,
      zainId,
      ahmedId,
      5,
      'Both controllers had zero drift and the console ran quietly all weekend.',
      '2026-10-21',
    );

    const completedBikeBooking = Number(
      insertBooking.run(
        roadBikeId,
        saraId,
        zainId,
        '2026-10-25',
        '2026-10-26',
        1,
        1800,
        1800,
        8000,
        'completed',
        'paid_demo',
        '2026-10-25 08:00:00',
        '',
      ).lastInsertRowid,
    );
    insertReview.run(
      completedBikeBooking,
      roadBikeId,
      saraId,
      zainId,
      5,
      'Shifting was crisp and the included helmet and U-lock saved me bringing my own.',
      '2026-10-27',
    );

    // Completed booking for Sara without a review yet (ready for "Leave a review" demo)
    insertBooking.run(
      projectorId,
      saraId,
      ahmedId,
      '2026-11-01',
      '2026-11-03',
      2,
      1800,
      3600,
      8000,
      'completed',
      'paid_demo',
      '2026-11-01 12:00:00',
      'Senior design presentation backup.',
    );

    // Seed saved favorites for Sara
    const insertFav = db.prepare('INSERT INTO favorites (user_id, listing_id) VALUES (?, ?)');
    insertFav.run(saraId, sonyId);
    insertFav.run(saraId, projectorId);

    // Seed in-app notifications
    const insertNotification = db.prepare(
      'INSERT INTO notifications (user_id, title, body, is_read) VALUES (?, ?, ?, 0)',
    );
    insertNotification.run(
      ahmedId,
      'New booking request received',
      'Sara Malik requested GoPro Hero 12 Adventure Bundle for 2 days (Rs. 3,000).',
    );
    insertNotification.run(
      saraId,
      'Booking approved by Ahmed Khan',
      'Your Sony A7 III Full-Frame Kit booking was approved. You can confirm demo payment anytime.',
    );

    // Seed simulated demo promotions for featured listings
    const insertPromo = db.prepare(
      "INSERT INTO demo_promotions (listing_id, plan_name, start_at, end_at, status) VALUES (?, ?, ?, ?, 'active')",
    );
    insertPromo.run(sonyId, '30-Day Featured Boost (Demo)', addDaysIso(-2), addDaysIso(30));
    insertPromo.run(ps5Id, '30-Day Featured Boost (Demo)', addDaysIso(-1), addDaysIso(30));

    // Seed sample moderation reports for Admin Demo page
    const insertReport = db.prepare(
      "INSERT INTO listing_reports (listing_id, reporter_id, reason, status) VALUES (?, ?, ?, 'open')",
    );
    insertReport.run(
      listingIds[8],
      zainId,
      'Sample report: Listing photo shows a drop-bar road bike while category says City Hybrid.',
    );
    insertReport.run(
      listingIds[11],
      ahmedId,
      'Sample report: Clarify whether HDMI adapter cable is included in presentation kit.',
    );
  });

  runSeed();
}
