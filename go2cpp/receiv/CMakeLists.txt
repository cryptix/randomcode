cmake_minimum_required (VERSION 2.8)
project(CommandParser)

set(CMAKE_C_COMPILER    "/usr/bin/clang")
set(CMAKE_CXX_COMPILER  "/usr/bin/clang++")

set(CMAKE_BUILD_TYPE Debug)
set(CMAKE_CXX_FLAGS "-std=c++11")


find_package(PkgConfig)
pkg_check_modules(PC_JSON REQUIRED jansson)

link_directories(${PC_JSON_LIBRARY_DIRS})

include_directories(${PC_JSON_INCLUDE_DIRS})



set(JsonRunner_SRCS main.cpp CommandParser.cpp JsonEncoder.cpp)

add_executable(CommandParser ${JsonRunner_SRCS})

target_link_libraries(CommandParser ${PC_JSON_LIBRARIES})